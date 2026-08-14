/**
 * Session tokens, kept outside React state so the API layer and the SSE stream can read the
 * current access token synchronously — the same reason the web client keeps them out of Redux
 * (TrueGisClient/src/app/utils/tgAuthToken.ts).
 */
import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'tg_access_token';
const REFRESH_KEY = 'tg_refresh_token';

let accessToken: string | null = null;
let refreshToken: string | null = null;
let loaded = false;

export async function loadTokens() {
  if (loaded) return { accessToken, refreshToken };

  try {
    [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
    ]);
  } catch {
    accessToken = null;
    refreshToken = null;
  }

  loaded = true;
  return { accessToken, refreshToken };
}

export function getAccessToken() {
  return accessToken;
}

export function getRefreshToken() {
  return refreshToken;
}

export async function setTokens(access: string | null, refresh: string | null) {
  accessToken = access;
  refreshToken = refresh;
  loaded = true;

  await Promise.all([persist(ACCESS_KEY, access), persist(REFRESH_KEY, refresh)]);
}

export async function clearTokens() {
  await setTokens(null, null);
}

async function persist(key: string, value: string | null) {
  try {
    if (value == null) {
      await SecureStore.deleteItemAsync(key);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  } catch {
    // Keychain unavailable — the in-memory copy still carries this session.
  }
}
