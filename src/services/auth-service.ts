/**
 * Telegram login handshake for the native app.
 *
 * `startLogin` asks the gateway for a one-time code and the bot deep link; the user presses
 * Start in Telegram; `pollLogin` then exchanges the code for the same session pair the Mini App
 * receives from `/auth/telegram`.
 */
import { APP_ID } from '@/constants/config';
import { request } from '@/services/api';
import { setTokens } from '@/services/token-store';

export type TelegramUser = {
  _id: string;
  telegram_id: number;
  full_name: string | null;
  phone: string | null;
  lang: string | null;
  telegram_name?: string | null;
  telegram_username?: string | null;
  telegram_profile_photo?: string | null;
};

export type LoginHandshake = {
  code: string;
  deep_link: string;
  /** Seconds. */
  expires_in: number;
  /** Seconds between `pollLogin` calls. */
  poll_interval: number;
};

type ExchangePending = { status: 'pending'; poll_interval?: number };
type ExchangeAuthorized = {
  status: 'authorized';
  access_token: string;
  refresh_token: string;
  user: TelegramUser;
};

export async function startLogin(signal?: AbortSignal): Promise<LoginHandshake> {
  return request<LoginHandshake>('/delivery/bot/auth/mobile/start', {
    method: 'POST',
    body: { app: APP_ID },
    auth: false,
    signal,
  });
}

/**
 * One poll tick. Resolves with the user once Telegram confirmed the code, or `null` while it is
 * still pending. Throws `ApiError` (401 `INVALID_LOGIN_CODE`) when the code died — restart then.
 */
export async function pollLogin(code: string, signal?: AbortSignal): Promise<TelegramUser | null> {
  const result = await request<ExchangePending | ExchangeAuthorized>(
    '/delivery/bot/auth/mobile/exchange',
    { method: 'POST', body: { code }, auth: false, signal }
  );

  if (result.status !== 'authorized') return null;

  await setTokens(result.access_token, result.refresh_token);
  return result.user;
}

/** Current user of the session — the same `/bot/me` the Mini App hydrates its profile from. */
export async function fetchCurrentUser(signal?: AbortSignal): Promise<TelegramUser> {
  return request<TelegramUser>('/bot/me', { signal });
}
