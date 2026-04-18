import { useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../../core/firebase';

export interface ParFotograficoPlano {
  id: string;
  urlAntes: string | null;
  urlDespues: string | null;
  ordenAbsoluto: number;
  circuitoNombre: string;
}

export interface FirmaMeta {
  nombre: string;
  cargo: string;
}

export interface PreviewDataResult {
  isLoading: boolean;
  reporteMeta: any;
  paresPlanos: ParFotograficoPlano[];
  firmaRealiza: FirmaMeta;
  firmaRevisa: FirmaMeta;
}

const FALLBACK_REALIZA: FirmaMeta = { nombre: 'Nombre no asignado', cargo: 'Cargo de realiza no especificado' };
const FALLBACK_REVISA: FirmaMeta = { nombre: 'Nombre no asignado', cargo: 'Cargo de revisa no especificado' };

export function usePreviewData(
  reporteId: string | undefined,
  circuitosFiltro: string[] = [],
  exportQuantities: Record<string, number> = {}
): PreviewDataResult {
  const [loading, setLoading] = useState(true);
  const [reporteMeta, setReporteMeta] = useState<any>(null);
  const [paresPlanos, setParesPlanos] = useState<ParFotograficoPlano[]>([]);
  const [firmaRealiza, setFirmaRealiza] = useState<FirmaMeta>(FALLBACK_REALIZA);
  const [firmaRevisa, setFirmaRevisa] = useState<FirmaMeta>(FALLBACK_REVISA);

  useEffect(() => {
    const fetchEstructuraCompleta = async () => {
      if (!reporteId) return;
      setLoading(true);
      try {
        // ---- 1. Reporte principal ----
        const repSnap = await getDoc(doc(db, 'reportes', reporteId));
        if (!repSnap.exists()) throw new Error("Reporte no existe");
        const meta = repSnap.data();
        setReporteMeta(meta);

        // ---- 2. Firma REALIZA (configuracion_global/app) ----
        const configSnap = await getDoc(doc(db, 'configuracion_global', 'app'));
        if (configSnap.exists()) {
          const cfg = configSnap.data();
          setFirmaRealiza({
            nombre: cfg.realizadoPor_nombre || FALLBACK_REALIZA.nombre,
            cargo: cfg.realizadoPor_cargo || FALLBACK_REALIZA.cargo,
          });
        }

        // ---- 3. Firma REVISA (personal_revisor por areaId) ----
        const areaId = meta.areaId;
        if (areaId) {
          const revQuery = query(
            collection(db, 'personal_revisor'),
            where('areaId', '==', areaId)
          );
          const revSnap = await getDocs(revQuery);
          if (!revSnap.empty) {
            const rev = revSnap.docs[0].data();
            const nombreArea = (meta.areaNombre || meta.area || meta.area_nombre || '').toUpperCase();
            const cargoConstruido = `JEFE DE ÁREA DE DISTRIBUCIÓN ${nombreArea}`;

            setFirmaRevisa({
              nombre: rev.nombre || FALLBACK_REVISA.nombre,
              cargo: cargoConstruido,
            });
          }
        }

        // ---- 4. Circuitos y pares (con filtrado por selección) ----
        const cQuery = query(
          collection(db, 'reportes', reporteId, 'circuitos'),
          orderBy('fechaCreacion', 'asc')
        );
        const cSnap = await getDocs(cQuery);

        // Filtrar por los IDs pasados desde ExportacionPage (si los hay)
        const circuitosTodos = cSnap.docs.filter((d) => !d.data().eliminado);
        const circuitosActivos = circuitosFiltro.length > 0
          ? circuitosTodos.filter((d) => circuitosFiltro.includes(d.id))
          : circuitosTodos;

        let ordenGlobal = 1;
        const arrParesPlanos: ParFotograficoPlano[] = [];

        const promesasPares = circuitosActivos.map(async (docC) => {
          const cData = docC.data();
          const pQuery = query(
            collection(db, 'reportes', reporteId, 'circuitos', docC.id, 'pares'),
            orderBy('orden', 'asc')
          );
          const pSnap = await getDocs(pQuery);
          // Aplicar límite de cantidad si fue especificado desde ExportacionPage
          const limite = exportQuantities[docC.id];
          const docsLimitados = limite ? pSnap.docs.slice(0, limite) : pSnap.docs;
          return { cData, docs: docsLimitados };
        });

        const resultadosPares = await Promise.all(promesasPares);

        resultadosPares.forEach(({ cData, docs }) => {
          docs.forEach((pDoc) => {
            const pData = pDoc.data();
            arrParesPlanos.push({
              id: pDoc.id,
              urlAntes: pData.urlAntes,
              urlDespues: pData.urlDespues,
              ordenAbsoluto: ordenGlobal,
              circuitoNombre: cData.nombre || 'Circuito Desconocido',
            });
            ordenGlobal++;
          });
        });

        setParesPlanos(arrParesPlanos);
      } catch (e) {
        console.error("Error compilando árbol para PDF:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchEstructuraCompleta();
  }, [reporteId, JSON.stringify(circuitosFiltro), JSON.stringify(exportQuantities)]);

  return { isLoading: loading, reporteMeta, paresPlanos, firmaRealiza, firmaRevisa };
}
