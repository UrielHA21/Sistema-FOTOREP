import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AccessibilityState {
  highContrast: boolean;
  largeText: boolean;
  dyslexicFont: boolean;
  simpleMode: boolean; // Modo minimalista: Ocultar texto en botones, mostrar solo icono
  toggleHighContrast: () => void;
  toggleLargeText: () => void;
  toggleDyslexicFont: () => void;
  toggleSimpleMode: () => void;
}

export const useAccessibilityStore = create<AccessibilityState>()(
  persist(
    (set) => ({
      highContrast: false,
      largeText: false,
      dyslexicFont: false,
      simpleMode: false,
      toggleHighContrast: () => set((state) => ({ highContrast: !state.highContrast })),
      toggleLargeText: () => set((state) => ({ largeText: !state.largeText })),
      toggleDyslexicFont: () => set((state) => ({ dyslexicFont: !state.dyslexicFont })),
      toggleSimpleMode: () => set((state) => ({ simpleMode: !state.simpleMode })),
    }),
    {
      name: 'accessibility-storage',
    }
  )
);
