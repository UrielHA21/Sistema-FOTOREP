import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../core/firebase';

export interface GlobalConfig {
  realizadoPor_nombre: string;
  realizadoPor_cargo: string;
  ultimaActualizacion?: any;
}

const SINGLETON_REF = doc(db, 'configuracion_global', 'app');

export function useGlobalConfig() {
  const [config, setConfig] = useState<GlobalConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(SINGLETON_REF, (snap) => {
      if (snap.exists()) {
        setConfig(snap.data() as GlobalConfig);
      } else {
        setConfig(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const updateGlobalConfig = async (data: Omit<GlobalConfig, 'ultimaActualizacion'>) => {
    await setDoc(SINGLETON_REF, {
      ...data,
      ultimaActualizacion: serverTimestamp(),
    }, { merge: true });
  };

  return { config, loading, updateGlobalConfig };
}
