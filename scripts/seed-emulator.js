import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, collection, addDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "dummy-key-for-emulator",
  authDomain: "fotorep-dev.firebaseapp.com",
  projectId: "fotorep",
  storageBucket: "fotorep-dev.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:dummy"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Connect to emulators
connectAuthEmulator(auth, "http://localhost:9099");
connectFirestoreEmulator(db, "localhost", 8080);

async function seed() {
  console.log("Iniciando la carga de datos de prueba (seeding)...");

  let uid = "";
  const email = "admin@fotorep.com";
  const password = "admin123";

  // 1. Crear usuario administrador en Auth
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    uid = userCredential.user.uid;
    console.log(`Usuario administrador creado con UID: ${uid}`);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log("El usuario administrador ya existe. Intentando obtener UID...");
      // Intentar iniciar sesión para obtener el UID
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        uid = userCredential.user.uid;
        console.log(`Usuario existente autenticado. UID: ${uid}`);
      } catch (loginError) {
        console.error("Error al autenticar usuario existente:", loginError);
        process.exit(1);
      }
    } else {
      console.error("Error al crear usuario administrador:", error);
      process.exit(1);
    }
  }

  // 2. Crear documento de perfil en Firestore (colección 'usuarios')
  try {
    const userDocRef = doc(db, 'usuarios', uid);
    await setDoc(userDocRef, {
      uid: uid,
      nombre: "Administrador FOTOREP",
      email: email,
      rol: "admin",
      activo: true,
      fechaCreacion: new Date().toISOString()
    });
    console.log("Perfil de administrador guardado en Firestore.");
  } catch (error) {
    console.error("Error al guardar perfil en Firestore:", error);
    process.exit(1);
  }

  // 3. Crear catálogos mínimos requeridos
  try {
    // Zonas
    const zonaRef = doc(db, 'zonas', 'zona_centro');
    await setDoc(zonaRef, {
      nombre: "Zona Centro",
      activo: true
    });
    console.log("Zona de prueba creada.");

    // Áreas
    const areaRef = doc(db, 'areas', 'area_distribucion_1');
    await setDoc(areaRef, {
      nombre: "Área de Distribución Centro",
      zonaId: "zona_centro",
      activo: true
    });
    console.log("Área de prueba creada.");

    // Personal Revisor
    const revisorRef = doc(db, 'personal_revisor', 'revisor_1');
    await setDoc(revisorRef, {
      nombre: "Ing. Alejandro Pérez",
      puesto: "Supervisor de Líneas",
      areaId: "area_distribucion_1",
      activo: true
    });
    console.log("Personal revisor de prueba creado.");

  } catch (error) {
    console.error("Error al crear catálogos en Firestore:", error);
    process.exit(1);
  }

  // 4. Crear un reporte de prueba con subcolecciones
  try {
    const reportId = "reporte_ejemplo_1";
    const reportRef = doc(db, 'reportes', reportId);
    
    // Crear el reporte
    await setDoc(reportRef, {
      clave: "REP-2026-001",
      areaId: "area_distribucion_1",
      zonaId: "zona_centro",
      supervisorId: "revisor_1",
      descripcion: "Reporte de evidencia fotográfica de la línea de media tensión Centro-Sur",
      activo: true,
      fechaCreacion: new Date().toISOString()
    });
    console.log(`Reporte de prueba creado con ID: ${reportId}`);

    // Crear un circuito
    const circuitoId = "circuito_ejemplo_1";
    const circuitoRef = doc(db, 'reportes', reportId, 'circuitos', circuitoId);
    await setDoc(circuitoRef, {
      clave: "C-101",
      nombre: "Alimentador Centro-Sur 13.8kV",
      fechaCreacion: new Date().toISOString()
    });
    console.log(`Circuito de prueba creado con ID: ${circuitoId}`);

    // Crear un par de prueba en el circuito
    const parId = "par_ejemplo_1";
    const parRef = doc(db, 'reportes', reportId, 'circuitos', circuitoId, 'pares', parId);
    await setDoc(parRef, {
      noPar: "1",
      tubo: "T-01",
      par: "Par A",
      bobina: "B-250",
      estado: "Bueno",
      comentarios: "Par verificado con atenuación aceptable",
      fotoAntes: "https://placehold.co/400x300/e0e0e0/555555?text=Antes",
      fotoDespues: "https://placehold.co/400x300/bdecb6/333333?text=Despues",
      fechaCreacion: new Date().toISOString()
    });
    console.log(`Par de prueba creado con ID: ${parId}`);

  } catch (error) {
    console.error("Error al crear el reporte y sus circuitos/pares:", error);
    process.exit(1);
  }

  console.log("Seeding completado con éxito!.");
  process.exit(0);
}

seed();
