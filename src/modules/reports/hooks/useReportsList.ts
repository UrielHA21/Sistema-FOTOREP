import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../core/firebase';

export interface Reporte {
  id: string;
  zonaId: string;
  areaId: string;
  revisadoPorId: string;
  zonaNombre: string;
  areaNombre: string;
  revisorNombre: string;
  tipoFormato: string;
  numeroEstimacion: string;
  estado: string;
  totalPares: number;
  fechaCreacion: any;
}

export function useReportsList() {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'reportes'),
      orderBy('fechaCreacion', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dataObj: Reporte[] = [];
      snapshot.forEach((pDoc) => {
        const data = pDoc.data();
        if (data.estado !== 'eliminado') {
           dataObj.push({ id: pDoc.id, ...data } as Reporte);
        }
      });
      setReportes(dataObj);
      setLoading(false);
      setError(null);
    }, (error) => {
      console.error("Error fetching reports:", error);
      setError(error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const eliminarReporte = async (reporteId: string) => {
    const docRef = doc(db, 'reportes', reporteId);
    await updateDoc(docRef, {
       estado: 'eliminado',
       fechaEliminacion: serverTimestamp()
    });
  };

  return { reportes, loading, error, eliminarReporte };
}
