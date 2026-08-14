/**
 * Who the gateway thinks we are, kept outside React so the API layer can stamp it on every
 * request synchronously — the native counterpart of the Mini App's `applyTelegramAuthHeaders`
 * (TrueGisClient/src/app/utils/telegramAuthHeaders.ts).
 *
 * The Bearer JWT is the real credential; these headers are the legacy identity the gateway still
 * reads on a number of `/delivery/bot/*` endpoints, which reject the request without them.
 */
import * as SecureStore from 'expo-secure-store';

const KEY = 'tg_identity';

export type TelegramIdentity = {
  telegramId?: string | null;
  name?: string | null;
  username?: string | null;
  photoUrl?: string | null;
  lang?: string | null;
};

let identity: TelegramIdentity = {};
let loaded = false;

export async function loadIdentity(): Promise<TelegramIdentity> {
  if (loaded) return identity;

  try {
    const stored = await SecureStore.getItemAsync(KEY);
    if (stored) identity = JSON.parse(stored) as TelegramIdentity;
  } catch {
    identity = {};
  }

  loaded = true;
  return identity;
}

export function getIdentity(): TelegramIdentity {
  return identity;
}

/** Merges into the stored identity — the language is set on its own, apart from the user. */
export async function setIdentity(next: TelegramIdentity) {
  identity = { ...identity, ...next };
  loaded = true;

  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(identity));
  } catch {
    // Keychain unavailable — the in-memory copy still carries this session.
  }
}

export async function clearIdentity() {
  const { lang } = identity;
  // The language is a device preference, not part of the session.
  identity = { lang };
  loaded = true;

  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(identity));
  } catch {
    // Ignored, as above.
  }
}
