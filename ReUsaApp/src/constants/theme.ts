import { Platform } from 'react-native';

/** Paleta clara y oscura moderna inspirada en TdeA y diseño móvil contemporáneo. */
export const Colors = {
  light: {
    text: '#0F172A', // Slate 900
    background: '#F8FAFC', // Slate 50 - lienzo limpio y suave
    backgroundElement: '#FFFFFF', // Blanco puro para tarjetas elevadas
    backgroundSelected: '#F1F5F9', // Slate 100
    textSecondary: '#64748B', // Slate 500
    primary: '#059669', // Emerald 600 - Verde Institucional TdeA
    primaryLight: '#ECFDF5', // Emerald 50 para badges y acentos
    primaryDark: '#047857', // Emerald 700
    onPrimary: '#FFFFFF',
    border: '#E2E8F0', // Slate 200 - bordes ultra finos y limpios
    danger: '#EF4444',
    dangerLight: '#FEF2F2',
    success: '#10B981',
    successLight: '#ECFDF5',
    warning: '#F59E0B',
    warningLight: '#FFFBEB',
  },
  dark: {
    text: '#F8FAFC',
    background: '#090D16', // Medianoche profundo
    backgroundElement: '#131B2E', // Tarjetas oscuras elevadas
    backgroundSelected: '#1E293B',
    textSecondary: '#94A3B8',
    primary: '#10B981',
    primaryLight: '#064E3B',
    primaryDark: '#059669',
    onPrimary: '#022C22',
    border: '#1E293B',
    danger: '#F87171',
    dangerLight: '#450A0A',
    success: '#34D399',
    successLight: '#064E3B',
    warning: '#FBBF24',
    warningLight: '#451A03',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Escala de espaciado estándar */
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Espacio inferior para evitar solapamiento con la barra de pestañas */
export const BottomTabInset = Platform.select({ ios: 60, android: 90 }) ?? 80;

/** Ancho máximo del contenido en tabletas */
export const MaxContentWidth = 800;
