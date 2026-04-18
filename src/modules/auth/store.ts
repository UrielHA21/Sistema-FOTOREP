import { create } from 'zustand';
import { type User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../core/firebase';

// Perfil del usuario almacenado en Firestore (colección 'usuarios/{uid}')
export interface UserProfile {
  uid: string;
  email?: string;
  nombre?: string;
  rol: 'admin' | 'colaborador'; // Roles disponibles en el sistema
  [key: string]: unknown;
}

interface AuthState {
  user: User | null;
  userProfile: UserProfile | null; // Perfil extendido desde Firestore
  isAuthenticated: boolean;
  isInitialized: boolean;
  initializeAuthListener: () => () => void;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  userProfile: null,
  isAuthenticated: false,
  isInitialized: false,

  initializeAuthListener: () => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Usuario autenticado: leer perfil desde Firestore
        let profile: UserProfile = {
          uid: user.uid,
          email: user.email ?? undefined,
          rol: 'colaborador', // Rol por defecto si el documento no existe o no tiene 'rol'
        };

        try {
          const docRef = doc(db, 'usuarios', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            profile = {
              uid: user.uid,
              email: user.email ?? undefined,
              rol: data.rol === 'admin' ? 'admin' : 'colaborador', // Validación estricta del rol
              ...data,
            };
          }
        } catch (err) {
          // Si Firestore falla (emulador apagado, sin permisos), asumir colaborador
          console.warn('[AuthStore] No se pudo leer el perfil de Firestore:', err);
        }

        set({
          user,
          userProfile: profile,
          isAuthenticated: true,
          isInitialized: true,
        });
      } else {
        // Sin sesión activa: limpiar todo
        set({
          user: null,
          userProfile: null,
          isAuthenticated: false,
          isInitialized: true,
        });
      }
    });

    return unsubscribe;
  },

  login: async (email, pass) => {
    await signInWithEmailAndPassword(auth, email, pass);
  },

  logout: async () => {
    await signOut(auth);
    set({ user: null, userProfile: null, isAuthenticated: false });
  },
}));

