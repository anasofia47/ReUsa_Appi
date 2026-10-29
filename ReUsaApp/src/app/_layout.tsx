import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { migrateDbIfNeeded } from '@/db/migrations';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { DataProvider } from '@/providers/data-provider';

// La pantalla de carga nativa permanece hasta saber si hay una sesión guardada.
SplashScreen.preventAutoHideAsync().catch(() => {});

function RootStack() {
  const { status } = useAuth();

  useEffect(() => {
    if (status !== 'loading') {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [status]);

  if (status === 'loading') return null;
  const signedIn = status === 'signedIn';

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Rutas no autenticadas */}
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" options={{ headerShown: true, title: 'Crear cuenta' }} />
      </Stack.Protected>

      {/* Rutas autenticadas */}
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="item/[id]"
          options={{ headerShown: true, title: 'Detalle del producto' }}
        />
        <Stack.Screen
          name="book/[id]"
          options={{ headerShown: true, title: 'Detalle del libro' }}
        />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style="auto" />
      <SQLiteProvider databaseName="reusa.db" onInit={migrateDbIfNeeded}>
        <AuthProvider>
          <DataProvider>
            <RootStack />
          </DataProvider>
        </AuthProvider>
      </SQLiteProvider>
    </ThemeProvider>
  );
}
