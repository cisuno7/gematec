// Timeout para requisições HTTP
// DEV: 180s (3 min - Expo Go usa proxies com latência, backend pode ser lento)
// PROD: 15s (APK compilado, conexão direta)
export const REQUEST_TIMEOUT = __DEV__ ? 180000 : 15000;
export const REFRESH_TOKEN_TIMEOUT = __DEV__ ? 180000 : 10000;

