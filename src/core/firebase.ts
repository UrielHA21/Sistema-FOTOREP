import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Configuración dummy. Firebase requiere este objeto para inicializar, 
// aunque en modo local no valida las llaves reales.
const firebaseConfig = {
    apiKey: "demo-api-key",
    authDomain: "fotorep-dev-local.firebaseapp.com",
    projectId: "fotorep-dev-local",
    storageBucket: "fotorep-dev-local.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Conectamos a los emuladores SOLAMENTE si estamos en entorno de desarrollo (local)
if (import.meta.env.DEV) {
    connectAuthEmulator(auth, "http://localhost:9099");
    connectFirestoreEmulator(db, "localhost", 8080);
    connectStorageEmulator(storage, "localhost", 9199);
    connectFunctionsEmulator(functions, "localhost", 5001);
}
