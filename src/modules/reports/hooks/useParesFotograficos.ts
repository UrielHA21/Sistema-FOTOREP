import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, writeBatch, deleteDoc, increment } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../core/firebase';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { optimizeImage, type CompressionLevel } from '../../../shared/utils/imageOptimizer';

export interface ParFotografico {
  id: string;
  urlAntes: string | null;
  urlDespues: string | null;
  orden: number;
  fechaSubida: any;
}

export function useParesFotograficos(reporteId: string | undefined, circuitoId: string | undefined) {
  const [pares, setPares] = useState<ParFotografico[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [isZipping, setIsZipping] = useState(false);

  useEffect(() => {
    if (!reporteId || !circuitoId) {
      setLoadingList(false);
      return;
    }

    const q = query(
      collection(db, 'reportes', reporteId, 'circuitos', circuitoId, 'pares'),
      orderBy('orden', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: ParFotografico[] = [];
      snapshot.forEach((pDoc) => {
        data.push({ id: pDoc.id, ...pDoc.data() } as ParFotografico);
      });
      setPares(data);
      setLoadingList(false);
    });

    return () => unsubscribe();
  }, [reporteId, circuitoId]);

  const crearParVacio = async (skipIncrement: boolean = false) => {
    if (!reporteId || !circuitoId) throw new Error("Faltan IDs estructurales.");
    const nextOrden = pares.length > 0 ? Math.max(...pares.map(p => p.orden)) + 1 : 1;
    const docRef = await addDoc(collection(db, 'reportes', reporteId, 'circuitos', circuitoId, 'pares'), {
      urlAntes: null,
      urlDespues: null,
      orden: nextOrden,
      fechaSubida: serverTimestamp()
    });

    if (!skipIncrement) {
       await updateDoc(doc(db, 'reportes', reporteId, 'circuitos', circuitoId), {
          totalPares: increment(1)
       });
    }

    return docRef.id;
  };

  const actualizarMitadPar = async (parId: string, lado: 'antes' | 'despues', file: File, qualityLevel: CompressionLevel = 'light') => {
    if (!reporteId || !circuitoId || !parId) throw new Error("Faltan identificadores para actualizar.");
    
    try {
      const timestamp = new Date().getTime();
      const storageRef = ref(storage, `reportes/${reporteId}/circuitos/${circuitoId}/pares/${timestamp}_${lado}.jpg`);
      
      const optimizedFile = await optimizeImage(file, qualityLevel);
      const snap = await uploadBytes(storageRef, optimizedFile);
      const downloadUrl = await getDownloadURL(snap.ref);

      const updateRef = doc(db, 'reportes', reporteId, 'circuitos', circuitoId, 'pares', parId);
      if (lado === 'antes') {
        await updateDoc(updateRef, { urlAntes: downloadUrl });
      } else {
        await updateDoc(updateRef, { urlDespues: downloadUrl });
      }
    } catch (e) {
      console.error(`Error actualizando lado ${lado}:`, e);
      throw e;
    }
  };

  const eliminarPar = async (parId: string) => {
    if (!reporteId || !circuitoId || !parId) return;
    await deleteDoc(doc(db, 'reportes', reporteId, 'circuitos', circuitoId, 'pares', parId));
    
    await updateDoc(doc(db, 'reportes', reporteId, 'circuitos', circuitoId), {
       totalPares: increment(-1)
    });
  };

  const intercambiarFotos = async (parId: string, urlAntes: string | null, urlDespues: string | null) => {
    if (!reporteId || !circuitoId || !parId) return;
    await updateDoc(doc(db, 'reportes', reporteId, 'circuitos', circuitoId, 'pares', parId), {
      urlAntes: urlDespues,
      urlDespues: urlAntes
    });
  };

  const reordenarPares = async (newOrderData: ParFotografico[]) => {
    if (!reporteId || !circuitoId) return;
    const batch = writeBatch(db);
    newOrderData.forEach((par, index) => {
      const parRef = doc(db, 'reportes', reporteId, 'circuitos', circuitoId, 'pares', par.id);
      batch.update(parRef, { orden: index + 1 });
    });
    await batch.commit();
  };

  const subirLoteMasivo = async (
    filesAntes: File[], 
    filesDespues: File[], 
    onProgress: (current: number, total: number) => void,
    qualityLevel: CompressionLevel = 'light'
  ) => {
    const totalPares = Math.max(filesAntes.length, filesDespues.length);
    if (totalPares === 0) return;

    for (let i = 0; i < totalPares; i++) {
        onProgress(i + 1, totalPares);
        const newParId = await crearParVacio(true); // Saltamos incremento invididual para evitar N requests web
        const promises = [];
        if (filesAntes[i]) {
            promises.push(actualizarMitadPar(newParId, 'antes', filesAntes[i], qualityLevel));
        }
        if (filesDespues[i]) {
            promises.push(actualizarMitadPar(newParId, 'despues', filesDespues[i], qualityLevel));
        }
        // Subida en paralelo del lado izq/der del par actual, espera su finalizacion antes de saltar la iteracion
        await Promise.all(promises); 
    }

    // Unico Golpe Maestro para registrar la contabilidad
    await updateDoc(doc(db, 'reportes', reporteId!, 'circuitos', circuitoId!), {
       totalPares: increment(totalPares)
    });
  };

  const descargarZip = async (circuitoNombre: string) => {
    if (pares.length === 0) return;
    setIsZipping(true);
    
    try {
      const zip = new JSZip();
      
      const fetchImageAsBlob = async (url: string) => {
        const response = await fetch(url);
        return await response.blob();
      };

      const promises = pares.map(async (par, index) => {
        const parIndex = String(index + 1).padStart(2, '0');
        if (par.urlAntes) {
          const blob = await fetchImageAsBlob(par.urlAntes);
          zip.file(`${parIndex}_ANTES.jpg`, blob);
        }
        if (par.urlDespues) {
          const blob = await fetchImageAsBlob(par.urlDespues);
          zip.file(`${parIndex}_DESPUES.jpg`, blob);
        }
      });

      await Promise.allSettled(promises);
      
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${circuitoNombre || 'circuito'}_Evidencias.zip`);
    } catch (e) {
      console.error("Error zipeando imágenes:", e);
    } finally {
      setIsZipping(false);
    }
  };

  return { 
    pares, 
    loadingList, 
    isZipping,
    crearParVacio, 
    actualizarMitadPar, 
    subirLoteMasivo,
    eliminarPar, 
    intercambiarFotos, 
    reordenarPares,
    descargarZip 
  };
}
