/**
 * Configuración por ambiente (semana 9).
 * Expo inyecta en el bundle las variables que empiezan con EXPO_PUBLIC_ leyéndolas de .env
 */
const rawApiUrl = process.env.EXPO_PUBLIC_API_URL;

/** URL base de reusa_api, sin "/" final. */
export const API_URL = (
  rawApiUrl && rawApiUrl.length > 0 ? rawApiUrl : 'http://localhost:3000'
).replace(/\/+$/, '');

/** Tiempo máximo de espera por petición antes de considerarla un fallo de red. */
export const REQUEST_TIMEOUT_MS = 10_000;
