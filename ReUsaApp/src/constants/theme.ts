import { Platform } from 'react-native';

/** Paleta clara y oscura. Los componentes la leen con el hook useTheme(). */
export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    primary: '#059669',
    onPrimary: '#FFFFFF',
    border: '#D4D6DC',
    danger: '#B42318',
    success: '#067647',
    warning: '#B54708',
  },
  dark: {
    text: '#ffffff',
    background: '#09090b',
    backgroundElement: '#18181b',
    backgroundSelected: '#27272a',
    textSecondary: '#A1A1AA',
    primary: '#10B981',
    onPrimary: '#022C22',
    border: '#3F3F46',
    danger: '#F87171',
    success: '#34D399',
    warning: '#FBBF24',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Escala de espaciado (múltiplos de 4 px). */
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Espacio inferior para que el contenido no quede tapado por la barra de pestañas. */
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;

/** Ancho máximo del contenido en pantallas grandes (tabletas). */
export const MaxContentWidth = 800;
