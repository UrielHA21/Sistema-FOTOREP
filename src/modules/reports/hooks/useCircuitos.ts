import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../core/firebase';

export interface Circuito {
  id: string;
  nombre: string;
  estado?: string;
  totalPares: number;
  fechaCreacion: any;
}

export function useCircuitos(reporteId: string | undefined) {
  const [circuitos, setCircuitos] = useState<Circuito[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reporteId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'reportes', reporteId, 'circuitos'),
      orderBy('fechaCreacion', 'asc') // Mostramos en orden de creación
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dataObj: Circuito[] = [];
      snapshot.forEach((pDoc) => {
        const itemInfo = pDoc.data();
        if (!itemInfo.eliminado) {
           dataObj.push({ id: pDoc.id, ...itemInfo } as Circuito);
        }
      });
      setCircuitos(dataObj);
      setLoading(false);
      setError(null);
    }, (error) => {
      console.error("Error fetching circuitos:", error);
      setError(error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [reporteId]);

  const agregarCircuito = async (nombre: string) => {
    if (!reporteId) throw new Error("No hay reporte ID");
    await addDoc(collection(db, 'reportes', reporteId, 'circuitos'), {
      nombre,
      estado: 'pendiente',
      totalPares: 0,
      fechaCreacion: serverTimestamp()
    });
  };

  const eliminarCircuito = async (circuitoId: string) => {
     if (!reporteId) return;
     const docRef = doc(db, 'reportes', reporteId, 'circuitos', circuitoId);
     await updateDoc(docRef, {
       eliminado: true,
       fechaEliminacion: serverTimestamp()
     });
  };

  return { circuitos, loading, error, agregarCircuito, eliminarCircuito };
}
