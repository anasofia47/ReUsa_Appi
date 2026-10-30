import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { API_URL, REQUEST_TIMEOUT_MS } from '@/config/env';
import { SessionManager, type SecureStorage } from '@/services/auth/session-manager';
import { createApiClient } from './client';

/** Cliente sin sesión: login, registro y refresh. */
const publicApi = createApiClient({ baseUrl: API_URL, timeoutMs: REQUEST_TIMEOUT_MS });

/** Almacenamiento seguro compatible con Web y Móvil (SecureStore en nativo, localStorage en Web) */
const storage: SecureStorage =
  Platform.OS === 'web'
    ? {
        async getItemAsync(key: string) {
          try {
            return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
          } catch {
            return null;
          }
        },
        async setItemAsync(key: string, value: string) {
          try {
            if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
          } catch {}
        },
        async deleteItemAsync(key: string) {
          try {
            if (typeof window !== 'undefined') window.localStorage.removeItem(key);
          } catch {}
        },
      }
    : SecureStore;

/** Única instancia de sesión de la app. */
export const session = new SessionManager(storage, publicApi);

/** Cliente autenticado: agrega Bearer, renueva el token en 401 y reintenta una vez. */
export const api = createApiClient({
  baseUrl: API_URL,
  timeoutMs: REQUEST_TIMEOUT_MS,
  auth: {
    getAccessToken: () => session.getAccessToken(),
    refreshSession: () => session.refresh(),
  },
});

export { publicApi };
