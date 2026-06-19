import { MantineProvider, createTheme } from '@mantine/core';
import { theme as baseTheme } from './theme';
import { useAccessibilityStore } from '../modules/accessibility/store';

export default function RootThemeProvider({ children }: { children: React.ReactNode }) {
  const { highContrast, largeText, dyslexicFont } = useAccessibilityStore();

  const accessibilityThemeOverrides: any = {
    fontFamily: dyslexicFont ? '"OpenDyslexic", "Comic Sans MS", sans-serif' : baseTheme.fontFamily,
    headings: {
      fontFamily: dyslexicFont ? '"OpenDyslexic", "Comic Sans MS", sans-serif' : baseTheme.headings?.fontFamily,
    },
    primaryColor: highContrast ? 'dark' : baseTheme.primaryColor,
  };

  if (largeText) {
    accessibilityThemeOverrides.fontSizes = {
      xs: '0.875rem',
      sm: '1rem',
      md: '1.125rem',
      lg: '1.25rem',
      xl: '1.5rem',
    };
  }

  if (highContrast) {
    accessibilityThemeOverrides.colors = {
      blue: [
        '#e6f0ff',
        '#b3d1ff',
        '#80b3ff',
        '#4d94ff',
        '#1a75ff',
        '#005ce6', // primary
        '#0047b3',
        '#003380',
        '#001f4d',
        '#000a1a',
      ],
    };
  }

  const currentTheme = createTheme({
    ...baseTheme,
    ...accessibilityThemeOverrides
  });

  return (
    <MantineProvider theme={currentTheme} forceColorScheme={highContrast ? 'dark' : 'light'}>
      {children}
    </MantineProvider>
  );
}
