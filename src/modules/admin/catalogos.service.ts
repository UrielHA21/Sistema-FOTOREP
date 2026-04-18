import { collection, getDocs, addDoc, updateDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../../core/firebase';

export interface BaseCatalog {
  id: string;
  nombre: string;
  activo: boolean;
  [key: string]: any;
}

export const catalogosService = {
  // LECTURA: Solo trae documentos activos. Filtro adicional aplicable (ej. zonaId)
  getCollection: async (collectionName: string, conditions?: Record<string, any>) => {
    let q = query(collection(db, collectionName), where('activo', '==', true));
    
    if (conditions) {
      for (const [key, value] of Object.entries(conditions)) {
        if (value !== undefined && value !== null && value !== '') {
           q = query(q, where(key, '==', value));
        }
      }
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as BaseCatalog[];
  },

  // ESCRITURA: Inserta forzando siempre activo true en la primera vez
  addDocument: async (collectionName: string, data: Omit<BaseCatalog, 'id' | 'activo'>) => {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      activo: true, 
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  },

  // ACTUALIZACIÓN DE DOCUMENTO COMPLETO/PARCIAL
  updateDocument: async (collectionName: string, id: string, data: Partial<BaseCatalog>) => {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, data);
  },

  // ELIMINACIÓN (Soft Delete)
  deleteDocument: async (collectionName: string, id: string) => {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, { activo: false });
  }
};
