import { describe, it, expect, beforeEach } from 'vitest';
import { useAccessibilityStore } from '../store';

describe('useAccessibilityStore', () => {
  beforeEach(() => {
    // Restaurar los valores por defecto antes de cada prueba
    useAccessibilityStore.setState({
      highContrast: false,
      largeText: false,
      dyslexicFont: false,
      simpleMode: false,
    });
  });

  it('debería inicializarse con todos los valores en false', () => {
    const state = useAccessibilityStore.getState();
    expect(state.highContrast).toBe(false);
    expect(state.largeText).toBe(false);
    expect(state.dyslexicFont).toBe(false);
    expect(state.simpleMode).toBe(false);
  });

  it('debería alternar (toggle) el valor de alto contraste (highContrast)', () => {
    useAccessibilityStore.getState().toggleHighContrast();
    expect(useAccessibilityStore.getState().highContrast).toBe(true);

    useAccessibilityStore.getState().toggleHighContrast();
    expect(useAccessibilityStore.getState().highContrast).toBe(false);
  });

  it('debería alternar (toggle) el valor de texto grande (largeText)', () => {
    useAccessibilityStore.getState().toggleLargeText();
    expect(useAccessibilityStore.getState().largeText).toBe(true);

    useAccessibilityStore.getState().toggleLargeText();
    expect(useAccessibilityStore.getState().largeText).toBe(false);
  });

  it('debería alternar (toggle) el valor de fuente disléxica (dyslexicFont)', () => {
    useAccessibilityStore.getState().toggleDyslexicFont();
    expect(useAccessibilityStore.getState().dyslexicFont).toBe(true);

    useAccessibilityStore.getState().toggleDyslexicFont();
    expect(useAccessibilityStore.getState().dyslexicFont).toBe(false);
  });

  it('debería alternar (toggle) el valor de modo minimalista (simpleMode)', () => {
    useAccessibilityStore.getState().toggleSimpleMode();
    expect(useAccessibilityStore.getState().simpleMode).toBe(true);

    useAccessibilityStore.getState().toggleSimpleMode();
    expect(useAccessibilityStore.getState().simpleMode).toBe(false);
  });
});
