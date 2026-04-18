import { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { notifications } from '@mantine/notifications';

interface CircuitoDict {
  [id: string]: string;
}

export function useZipExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const sanitizeFilename = (name: string) => name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();

  const downloadCircuitZip = async (
     reporteId: string, 
     reporteNombreArea: string,
     selectedCircuits: string[], 
     exportQuantities: Record<string, number>,
     circuitosNombres: CircuitoDict
  ) => {
    setIsExporting(true);
    setProgress(0);

    try {
      const zip = new JSZip();

      // Recolectar todas las URLs
      const imagesToFetch: { url: string, targetFolder: JSZip | null | undefined, fileName: string }[] = [];
      const reporteStr = `Reporte_${sanitizeFilename(reporteNombreArea)}`;

      for (const circId of selectedCircuits) {
         const qty = exportQuantities[circId] || 0;
         if (qty === 0) continue;

         const circName = sanitizeFilename(circuitosNombres[circId] || circId);
         
         const baseFolder = zip.folder(reporteStr)?.folder(circName);
         const folderAntes = baseFolder?.folder("Antes");
         const folderDespues = baseFolder?.folder("Despues");
         
         const pQuery = query(
            collection(db, 'reportes', reporteId, 'circuitos', circId, 'pares'), 
            orderBy('orden', 'asc'),
            limit(qty)
         );
         
         const pSnap = await getDocs(pQuery);

         let pIndex = 1;
         pSnap.forEach((doc) => {
            const data = doc.data();
            
            if (data.urlAntes) {
               imagesToFetch.push({ url: data.urlAntes, targetFolder: folderAntes, fileName: `Par_${pIndex}_Antes.jpg` });
            }
            if (data.urlDespues) {
               imagesToFetch.push({ url: data.urlDespues, targetFolder: folderDespues, fileName: `Par_${pIndex}_Despues.jpg` });
            }
            pIndex++;
         });
      }

      const totalImages = imagesToFetch.length;
      if (totalImages === 0) {
         notifications.show({ title: 'Aviso', message: 'No hay imágenes para descargar en los circuitos seleccionados.', color: 'yellow' });
         setIsExporting(false);
         return;
      }

      let completedImages = 0;

      // Descarga concurrente con Promise.all
      const fetchImageAsBlob = async ({ url, targetFolder, fileName }: { url: string, targetFolder: JSZip | null | undefined, fileName: string }) => {
         try {
            const response = await fetch(url);
            const blob = await response.blob();
            targetFolder?.file(fileName, blob);
         } catch (err) {
            console.error(`Error fetching image ${url}:`, err);
         } finally {
            completedImages++;
            setProgress(Math.round((completedImages / totalImages) * 100));
         }
      };

      const fetchPromises = imagesToFetch.map(fetchImageAsBlob);
      await Promise.all(fetchPromises);

      // Generar ZIP final
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `Reporte_${sanitizeFilename(reporteNombreArea)}_Imagenes.zip`);

      notifications.show({
         title: 'Éxito',
         message: 'El archivo ZIP se ha descargado correctamente.',
         color: 'green'
      });

    } catch (err) {
      console.error(err);
      notifications.show({
         title: 'Error',
         message: 'Ocurrió un error al generar el archivo ZIP. Revisa la consola.',
         color: 'red'
      });
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  return { isExporting, progress, downloadCircuitZip };
}
