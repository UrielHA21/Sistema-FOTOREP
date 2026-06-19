import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock de window.matchMedia requerido por Mantine y hooks responsivos en JSDOM
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecado
    removeListener: vi.fn(), // Deprecado
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
