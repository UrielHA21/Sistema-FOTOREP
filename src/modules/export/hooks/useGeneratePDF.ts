import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { notifications } from '@mantine/notifications';
import { functions } from '../../../core/firebase';
import { getLogoBase64 } from '../../../shared/utils/imageUtils';
import type { FirmaMeta, ParFotograficoPlano } from './usePreviewData';

// ─── Payload shapes (mirror the Cloud Function types) ────────────────────────

interface ReporteMetaPayload {
  zona: string;
  area: string;
  circuito: string;
  estimacion: string;
  fecha?: string;
  tipoFormato?: string;
}

interface ParPayload {
  urlAntes: string;
  urlDespues: string;
  circuito?: string;
  descripcion?: string;
}

interface CloudFunctionPayload {
  reporteMeta: ReporteMetaPayload;
  firmas: { realiza: FirmaMeta; revisa: FirmaMeta };
  logoBase64: string;
  paginas: ParPayload[][];
  disenoHoja: number;
}

interface CloudFunctionResult {
  success: boolean;
  pdfBase64: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGeneratePDF() {
  const [isGenerating, setIsGenerating] = useState(false);

  /**
   * Builds the payload and calls the Cloud Function.
   *
   * @param reporteMeta  - Raw Firestore document data from the reporte
   * @param firmaRealiza - Firm "Realiza" (nombre, cargo)
   * @param firmaRevisa  - Firm "Revisa"  (nombre, cargo)
   * @param paginas      - Already-chunked pages: ParFotograficoPlano[][]
   * The filename is built automatically from reporteMeta:
   *   FORMATO DE FOTOS {areaNombre} TIPO {tipoFormato}.pdf
   */
  const downloadPdf = async (
    reporteMeta: any,
    firmaRealiza: FirmaMeta,
    firmaRevisa: FirmaMeta,
    paginas: ParFotograficoPlano[][],
    disenoHoja: number
  ) => {
    // Build dynamic filename following the institutional standard
    const areaNombre   = (reporteMeta?.areaNombre   || 'AREA').toString().trim();
    const tipoFormato  = (reporteMeta?.tipoFormato  || 'N').toString().trim();
    // Sanitize: replace characters that are invalid in filenames
    const sanitize = (s: string) => s.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();
    const nombreArchivo = `FORMATO DE FOTOS ${sanitize(areaNombre)} TIPO ${sanitize(tipoFormato)}.pdf`;
    setIsGenerating(true);

    // Show "in progress" notification immediately
    const notifId = 'pdf-gen';
    notifications.show({
      id: notifId,
      title: 'Ensamblando PDF en el servidor',
      message: 'Esto puede tomar unos segundos dependiendo del número de imágenes...',
      loading: true,
      autoClose: false,
      withCloseButton: false,
      color: 'blue',
    });

    try {
      // ── A: Get the logo Base64 ──
      const logoBase64 = await getLogoBase64();

      // ── B: Map paginas to the payload shape expected by the Cloud Function ──
      const paginasPayload: ParPayload[][] = paginas.map((chunk) =>
        chunk
          .filter((p) => p.urlAntes || p.urlDespues) // skip completely empty pairs
          .map((p) => ({
            urlAntes: p.urlAntes ?? '',
            urlDespues: p.urlDespues ?? '',
            circuito: p.circuitoNombre,
          }))
      ).filter((chunk) => chunk.length > 0);

      // ── C: Build meta payload ──
      const metaPayload: ReporteMetaPayload = {
        zona:        reporteMeta?.zonaNombre        || reporteMeta?.zona        || '—',
        area:        reporteMeta?.areaNombre        || reporteMeta?.area        || '—',
        circuito:    reporteMeta?.circuitoNombre    || reporteMeta?.circuito    || '—',
        estimacion:  reporteMeta?.numeroEstimacion  || reporteMeta?.estimacion  || '—',
        fecha:       reporteMeta?.fecha
                       ? new Date(reporteMeta.fecha.seconds * 1000).toLocaleDateString('es-MX')
                       : new Date().toLocaleDateString('es-MX'),
        tipoFormato: reporteMeta?.tipoFormato        || '',
      };

      // Ensure cargo fields are never null/undefined (Cloud Function expects strings)
      const firmaRealizaSafe: FirmaMeta = {
        nombre: firmaRealiza.nombre || '',
        cargo:  firmaRealiza.cargo  || '',
      };
      const firmaRevisaSafe: FirmaMeta = {
        nombre: firmaRevisa.nombre || '',
        cargo:  firmaRevisa.cargo  || '',
      };

      const payload: CloudFunctionPayload = {
        reporteMeta: metaPayload,
        firmas: { realiza: firmaRealizaSafe, revisa: firmaRevisaSafe },
        logoBase64,
        paginas: paginasPayload,
        disenoHoja,
      };

      // ── D: Call Cloud Function ──
      const generarPDF = httpsCallable<CloudFunctionPayload, CloudFunctionResult>(
        functions,
        'generarReportePDF'
      );
      const result = await generarPDF(payload);

      if (!result.data?.success || !result.data?.pdfBase64) {
        throw new Error('La función retornó una respuesta vacía o fallida.');
      }

      // ── E: Trigger browser download ──
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${result.data.pdfBase64}`;
      link.download = nombreArchivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      notifications.update({
        id: notifId,
        title: '¡PDF generado exitosamente!',
        message: `El archivo ${nombreArchivo} se está descargando.`,
        color: 'green',
        loading: false,
        autoClose: 4000,
        withCloseButton: true,
      });
    } catch (err: any) {
      console.error('Error generando PDF:', err);

      notifications.update({
        id: notifId,
        title: 'Error al generar el PDF',
        message: err?.message ?? 'Ocurrió un error inesperado. Inténtalo de nuevo.',
        color: 'red',
        loading: false,
        autoClose: 6000,
        withCloseButton: true,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return { isGenerating, downloadPdf };
}
