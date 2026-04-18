import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  PageSizes,
  pushGraphicsState,
  popGraphicsState,
  rectangle,
  clip,
  endPath,
} from "pdf-lib";
import fetch from "node-fetch";

// ─── Global options (applies to all v2 functions) ────────────────────────────
setGlobalOptions({ maxInstances: 10 });

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReporteMeta {
  zona: string;
  area: string;
  circuito: string;
  estimacion: string;
  fecha?: string;
  folio?: string;
  tipoFormato?: string;
}

interface Firma {
  nombre: string;
  cargo: string;
}

interface ParFotografico {
  urlAntes: string;
  urlDespues: string;
  descripcion?: string;
  circuito?: string;
}

interface Payload {
  reporteMeta: ReporteMeta;
  firmas: { realiza: Firma; revisa: Firma };
  logoBase64: string; // PNG base64 string
  paginas: ParFotografico[][]; // Array de páginas (1 o 3 pares por página dependiente del diseño)
  disenoHoja: number; // 1 | 3
}

// ─── Helper: download image and return ArrayBuffer ───────────────────────────

async function downloadImage(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error descargando imagen: ${response.status} ${url}`);
  }
  return response.arrayBuffer();
}

// ─── Helper: detect image type from URL ──────────────────────────────────────

function isPng(url: string): boolean {
  return url.toLowerCase().includes(".png") ||
    url.toLowerCase().includes("image/png");
}

// ─── Helper: embed image (jpg o png) ─────────────────────────────────────────

async function embedImage(
  pdfDoc: PDFDocument,
  url: string,
  fallback: "jpg" | "png" = "jpg"
) {
  const buffer = await downloadImage(url);
  const uint8 = new Uint8Array(buffer);

  const looksLikePng = uint8[0] === 0x89 && uint8[1] === 0x50;

  if (looksLikePng || fallback === "png" || isPng(url)) {
    return pdfDoc.embedPng(uint8);
  }
  return pdfDoc.embedJpg(uint8);
}



// ─── Helper: draw bold label + regular value on the same baseline ─────────────

function drawMixedText(
  page: ReturnType<PDFDocument["addPage"]>,
  fontBold: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  fontRegular: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  size: number,
  x: number,
  y: number,
  boldPart: string,
  regularPart: string,
  color = rgb(0, 0, 0)
) {
  page.drawText(boldPart, { x, y, size, font: fontBold, color });
  const boldW = fontBold.widthOfTextAtSize(boldPart, size);
  page.drawText(regularPart, { x: x + boldW, y, size, font: fontRegular, color });
}

// ─── Layout Constants (Letter in points: 612 × 792) ──────────────────────────

const PAGE_W = PageSizes.Letter[0]; // 612
const PAGE_H = PageSizes.Letter[1]; // 792
// Use standard 1-inch (72pt) margins approximately or whatever looks best.
const MARGIN_X = 36;
const MARGIN_TOP = 30;
const MARGIN_BOTTOM = 25; // Reducido para mover el footer hacia abajo
const CONTENT_W = PAGE_W - MARGIN_X * 2;

// Header dimensions
const HEADER_H = 78;
const HEADER_Y_TOP = PAGE_H - MARGIN_TOP;

// Footer dimensions
const FOOTER_H = 100; // Aumentado para dar más espacio a la firma manuscrita
const FOOTER_Y_BOTTOM = MARGIN_BOTTOM;

// Photo area (between header and footer)
const PHOTO_AREA_TOP = HEADER_Y_TOP - HEADER_H;
const PHOTO_AREA_BOTTOM = FOOTER_Y_BOTTOM + FOOTER_H;
const PHOTO_AREA_H = PHOTO_AREA_TOP - PHOTO_AREA_BOTTOM;

// Coordenadas calculadas para que las líneas coincidan con las de las firmas
const LINE_START_X = 60;
const LINE_END_X = 552;

// ─── Helper: wrap text ───────────────────────────────────────────────────────
function wrapText(
  text: string,
  maxWidth: number,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  size: number
): string[] {
  if (!text) return [""];
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, size);
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

// ─── Helper: Draw Cover Image (Object-Fit: Cover) ───────────────────────────

async function drawCoverImage(
  page: ReturnType<PDFDocument["addPage"]>,
  pdfDoc: PDFDocument,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  url: string,
  x: number,
  y: number,
  targetW: number,
  targetH: number
) {
  try {
    const img = await embedImage(pdfDoc, url);
    const dims = img.scale(1);

    // Scale image to fill viewport
    const ratio = Math.max(targetW / dims.width, targetH / dims.height);
    const scaledW = dims.width * ratio;
    const scaledH = dims.height * ratio;

    // Center it within target
    const imgX = x + (targetW - scaledW) / 2;
    const imgY = y + (targetH - scaledH) / 2;

    // Apply clipping mask
    page.pushOperators(
      pushGraphicsState(),
      rectangle(x, y, targetW, targetH),
      clip(),
      endPath()
    );

    page.drawImage(img, {
      x: imgX,
      y: imgY,
      width: scaledW,
      height: scaledH,
    });

    page.pushOperators(popGraphicsState());

  } catch (e) {
    // If no image or error, draw placeholder
    page.drawRectangle({
      x,
      y,
      width: targetW,
      height: targetH,
      color: rgb(0.95, 0.95, 0.95),
    });
    const errMsg = "SIN IMAGEN";
    const tw = font.widthOfTextAtSize(errMsg, 8);
    page.drawText(errMsg, {
      x: x + targetW / 2 - tw / 2,
      y: y + targetH / 2 - 4,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  // Draw border for the view window
  page.drawRectangle({
    x,
    y,
    width: targetW,
    height: targetH,
    borderColor: rgb(0.2, 0.2, 0.2),
    borderWidth: 1,
  });
}


// ─── Draw Header ─────────────────────────────────────────────────────────────

async function drawHeader(
  page: ReturnType<PDFDocument["addPage"]>,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  fontBold: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  meta: ReporteMeta,
  logoImage: Awaited<ReturnType<PDFDocument["embedPng"]>> | null,
  circuitoNombre: string
) {
  const topY = HEADER_Y_TOP;

  // 1. Logo (Left)
  const logoZoneW = 85;
  const logoZoneH = HEADER_H;
  if (logoImage) {
    const logoDims = logoImage.scale(1);
    const maxLogoW = 75;
    const maxLogoH = 75;
    let lw = logoDims.width;
    let lh = logoDims.height;
    const ratio = Math.min(maxLogoW / lw, maxLogoH / lh);
    lw *= ratio;
    lh *= ratio;

    page.drawImage(logoImage, {
      x: MARGIN_X + 5,
      y: topY - HEADER_H + (logoZoneH - lh) / 2 + 5,
      width: lw,
      height: lh,
    });
  }

  // 3. Tabla Derecha (Puntos Fijos)
  const tableW = 240;
  const tableX = MARGIN_X + CONTENT_W - tableW + 15; // +15 para moverla más a la derecha
  const tableTopY = topY - 28; // Ajustado para centrar en HEADER_H = 80

  const sanitize = (v: string | undefined | null) => v ? v.toString().slice(0, 35) : "";

  // TAMAÑO DE LETRA DE LA TABLA DEL ENCABEZADO (Ajustado a 7pt para que sea más pequeño)
  const sizeTablaEncabezado = 8;
  const colOffset = 115; // Ajustado de 130 para ser más estrecho
  const rowGap = 12;     // Ajustado de 18 para ser más estrecho

  // Fila 1: ZONA, TIPO
  drawMixedText(page, fontBold, font, sizeTablaEncabezado, tableX, tableTopY, "ZONA: ", sanitize(meta.zona));
  drawMixedText(page, fontBold, font, sizeTablaEncabezado, tableX + colOffset, tableTopY, "TIPO: ", sanitize(meta.tipoFormato));

  // Fila 2: ÁREA, CIRCUITO
  drawMixedText(page, fontBold, font, sizeTablaEncabezado, tableX, tableTopY - rowGap, "ÁREA: ", sanitize(meta.area));
  drawMixedText(page, fontBold, font, sizeTablaEncabezado, tableX + colOffset, tableTopY - rowGap, "CIRCUITO: ", sanitize(circuitoNombre));

  // Fila 3: ESTIMACIÓN No. (Full width)
  drawMixedText(page, fontBold, font, sizeTablaEncabezado, tableX, tableTopY - (rowGap * 2), "ESTIMACIÓN No.: ", sanitize(meta.estimacion));

  // 2. Textos (Centrado relativo entre logo y tabla)
  const centerZoneX = MARGIN_X + logoZoneW;
  const centerZoneW = CONTENT_W - logoZoneW - tableW;
  const centerX = centerZoneX + centerZoneW / 2;

  const institutionalLines = [
    "COMISIÓN FEDERAL DE ELECTRICIDAD",
    "DIVISIÓN SURESTE",
    "FORMATO DE EVIDENCIA FOTOGRÁFICA"
  ];

  // TAMAÑO DE TITULOS INSTITUCIONALES (Ajustado a 8.5pt para que sea más pequeño)
  const sizeTitulosEncabezado = 10;
  const institutionalGap = 12; // Ajustado de 17 para ser más estrecho

  let textY = topY - 28; // Ajustado para centrar en HEADER_H = 80
  for (const line of institutionalLines) {
    const tw = fontBold.widthOfTextAtSize(line, sizeTitulosEncabezado);
    page.drawText(line, {
      x: centerX - tw / 2,
      y: textY,
      size: sizeTitulosEncabezado,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    textY -= institutionalGap;
  }

  // 4. Línea Inferior Principal
  page.drawLine({
    start: { x: LINE_START_X, y: topY - HEADER_H },
    end: { x: LINE_END_X, y: topY - HEADER_H },
    thickness: 0.5,
    color: rgb(0, 0, 0),
  });

  // 4.1 SEGUNDA LÍNEA (AJUSTABLE)
  // PUEDES CAMBIAR EL VALOR DE "thickness" PARA AJUSTAR EL GROSOR DE ESTA LÍNEA EXTRA
  page.drawLine({
    start: { x: LINE_START_X, y: topY - HEADER_H + 5 },
    end: { x: LINE_END_X, y: topY - HEADER_H + 5 },
    thickness: 1.5, // <--- CAMBIA ESTE NÚMERO PARA EL GROSOR
    color: rgb(0, 0, 0),
  });
}

// ─── Draw Footer (Signatures) ─────────────────────────────────────────────────

function drawFooter(
  page: ReturnType<PDFDocument["addPage"]>,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  fontBold: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  firmas: { realiza: Firma; revisa: Firma }
) {
  const footerY = FOOTER_Y_BOTTOM + FOOTER_H; // Top of the footer box

  // Línea divisoria superior del footer (Ajustada a elementos)
  page.drawLine({
    start: { x: LINE_START_X, y: footerY },
    end: { x: LINE_END_X, y: footerY },
    thickness: 1, // Grosor reducido
    color: rgb(0, 0, 0),
  });

  const sigLineW = 200; // Ancho fijo de la línea de firma

  const cols = [
    { label: "REALIZA:", firma: firmas.realiza, cx: 160 }, // Centro izquierdo
    { label: "REVISA:", firma: firmas.revisa, cx: 452 },   // Centro derecho
  ];

  // TAMAÑO DE TEXTOS EN EL PIE DE PAGINA (Firmas) (Ajustado a 7.5pt para que sea más pequeño)
  const sizeTextosFooter = 7;

  for (const col of cols) {
    const cx = col.cx;
    const maxTextW = sigLineW; // El texto puede ocupar todo el ancho de la línea de firma

    // Bold label title (Elección: texto ligeramente más arriba)
    const labelW = fontBold.widthOfTextAtSize(col.label, sizeTextosFooter);
    page.drawText(col.label, {
      x: cx - labelW / 2,
      y: footerY - 10, // Subido de -14 a -10 para quedar más arriba
      size: sizeTextosFooter,
      font: fontBold,
      color: rgb(0, 0, 0),
    });

    // Signature line: Su inicio/final definen el ancho de las líneas principales del PDF
    const sigLineY = FOOTER_Y_BOTTOM + 55;
    page.drawLine({
      start: { x: cx - sigLineW / 2, y: sigLineY },
      end: { x: cx + sigLineW / 2, y: sigLineY },
      thickness: 0.8,
      color: rgb(0, 0, 0),
    });

    // Name (regular) - WRAPPED
    let currentY = sigLineY - 14;
    const nameLines = wrapText(col.firma.nombre, maxTextW, font, sizeTextosFooter);
    for (const line of nameLines) {
      const lineW = font.widthOfTextAtSize(line, sizeTextosFooter);
      page.drawText(line, {
        x: cx - lineW / 2,
        y: currentY,
        size: sizeTextosFooter,
        font,
        color: rgb(0, 0, 0),
      });
      currentY -= 10;
    }

    currentY -= 2; // gap

    // Cargo (regular) - WRAPPED
    const cargoLines = wrapText(col.firma.cargo, maxTextW, font, sizeTextosFooter);
    for (const line of cargoLines) {
      const lineW = font.widthOfTextAtSize(line, sizeTextosFooter);
      page.drawText(line, {
        x: cx - lineW / 2,
        y: currentY,
        size: sizeTextosFooter,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });
      currentY -= 10;
    }
  }
}

// ─── Draw Layouts ────────────────────────────────────────────────────────────

async function drawLayout1(
  page: ReturnType<PDFDocument["addPage"]>,
  pdfDoc: PDFDocument,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  fontBold: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  par: ParFotografico
) {
  // Use most of PHOTO_AREA_H vertically, split into two.
  const paddingY = 20;
  const labelH = 15;
  const imgAreaH = (PHOTO_AREA_H - paddingY * 3 - labelH * 2) / 2;
  const imgAreaW = CONTENT_W * 0.82;
  const startX = MARGIN_X + (CONTENT_W - imgAreaW) / 2;

  // ANTES Y
  const antesLabelY = PHOTO_AREA_TOP - paddingY;
  const antesImgY = antesLabelY - labelH - imgAreaH;

  // DESPUES Y
  const despuesLabelY = antesImgY - paddingY;
  const despuesImgY = despuesLabelY - labelH - imgAreaH;

  // draw ANTES label
  const antesLabel = "ANTES:";
  const twA = fontBold.widthOfTextAtSize(antesLabel, 9);
  page.drawText(antesLabel, {
    x: startX + imgAreaW / 2 - twA / 2,
    y: antesLabelY - 9, // adjust baseline
    size: 9,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // draw ANTES img
  await drawCoverImage(page, pdfDoc, font, par.urlAntes, startX, antesImgY, imgAreaW, imgAreaH);

  // draw DESPUES label
  const despuesLabel = "DESPUÉS:";
  const twD = fontBold.widthOfTextAtSize(despuesLabel, 9);
  page.drawText(despuesLabel, {
    x: startX + imgAreaW / 2 - twD / 2,
    y: despuesLabelY - 9, // adjust baseline
    size: 9,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // draw DESPUES img
  await drawCoverImage(page, pdfDoc, font, par.urlDespues, startX, despuesImgY, imgAreaW, imgAreaH);
}

async function drawLayout3(
  page: ReturnType<PDFDocument["addPage"]>,
  pdfDoc: PDFDocument,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  fontBold: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  pares: ParFotografico[]
) {
  const numPares = Math.min(pares.length, 3);
  const rowH = PHOTO_AREA_H / 3;

  for (let i = 0; i < numPares; i++) {
    const par = pares[i];
    const rowTopY = PHOTO_AREA_TOP - rowH * i;
    const rowBottomY = rowTopY - rowH;



    const paddingY = 12;
    const labelH = 12;
    const imgAreaH = rowH - labelH - paddingY * 2;

    // 2 images side by side
    const gap = 30;
    const paddingX = 30;
    const singleImgW = (CONTENT_W - paddingX * 2 - gap) / 2;

    const startX = MARGIN_X + paddingX;

    const imgY = rowBottomY + paddingY;
    const labelTopY = imgY + imgAreaH + 4;

    // ANTES label (Left aligned over image)
    page.drawText("ANTES:", {
      x: startX,
      y: labelTopY,
      size: 8,
      font: fontBold,
      color: rgb(0, 0, 0),
    });

    // ANTES img
    await drawCoverImage(page, pdfDoc, font, par.urlAntes, startX, imgY, singleImgW, imgAreaH);

    const despuesX = startX + singleImgW + gap;

    // DESPUÉS label (Right aligned over image)
    const despuesLabel = "DESPUÉS:";
    const despuesTw = fontBold.widthOfTextAtSize(despuesLabel, 8);
    page.drawText(despuesLabel, {
      x: despuesX + singleImgW - despuesTw,
      y: labelTopY,
      size: 8,
      font: fontBold,
      color: rgb(0, 0, 0),
    });

    // DESPUÉS img
    await drawCoverImage(page, pdfDoc, font, par.urlDespues, despuesX, imgY, singleImgW, imgAreaH);
  }
}

// ─── Main Cloud Function ──────────────────────────────────────────────────────

export const generarReportePDF = onCall(
  {
    memory: "2GiB",
    timeoutSeconds: 300,
    maxInstances: 10,
  },
  async (request) => {
    const data = request.data as Payload;

    // ── Basic validation ──
    if (!data || !data.reporteMeta || !data.paginas || !Array.isArray(data.paginas)) {
      throw new HttpsError("invalid-argument", "Payload incompleto o inválido.");
    }

    try {
      // ── Initialize PDF ──
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // ── Embed logo ──
      let logoImage: Awaited<ReturnType<typeof pdfDoc.embedPng>> | null = null;
      if (data.logoBase64) {
        try {
          const raw = data.logoBase64.replace(/^data:image\/\w+;base64,/, "");
          const logoBytes = Buffer.from(raw, "base64");
          logoImage = await pdfDoc.embedPng(logoBytes);
        } catch (e) {
          console.warn("No se pudo incrustar el logo:", e);
        }
      }

      const isLayout1 = data.disenoHoja === 1;

      // ── Iterate pages ──
      for (const paginaPares of data.paginas) {
        if (!paginaPares || paginaPares.length === 0) continue;

        const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

        const circuitoDeHoja = paginaPares[0]?.circuito || data.reporteMeta.circuito || '—';

        // Draw header
        await drawHeader(page, font, fontBold, data.reporteMeta, logoImage, circuitoDeHoja);

        // Draw photo pairs based on layout
        if (isLayout1) {
          await drawLayout1(page, pdfDoc, font, fontBold, paginaPares[0]);
        } else {
          await drawLayout3(page, pdfDoc, font, fontBold, paginaPares);
        }

        // Draw footer
        drawFooter(page, font, fontBold, data.firmas);

        // ─── Unir líneas horizontales con verticales (Formar Rectángulo) ───
        const frameTopY = HEADER_Y_TOP - HEADER_H;
        const frameBottomY = FOOTER_Y_BOTTOM + FOOTER_H;

        // Línea Vertical Izquierda
        page.drawLine({
          start: { x: LINE_START_X, y: frameTopY },
          end: { x: LINE_START_X, y: frameBottomY },
          thickness: 1,
          color: rgb(0, 0, 0),
        });

        // Línea Vertical Derecha
        page.drawLine({
          start: { x: LINE_END_X, y: frameTopY },
          end: { x: LINE_END_X, y: frameBottomY },
          thickness: 1,
          color: rgb(0, 0, 0),
        });
      }

      // ── Serialize ──
      const pdfBase64 = await pdfDoc.saveAsBase64();
      return { success: true, pdfBase64 };
    } catch (err) {
      console.error("Error generando PDF:", err);
      throw new HttpsError(
        "internal",
        `Error interno al generar el PDF: ${(err as Error).message}`
      );
    }
  }
);
