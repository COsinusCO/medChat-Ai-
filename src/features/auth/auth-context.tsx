/**
 * Session state for the app: who is logged in, and the Telegram handshake that gets us there.
 *
 * The handshake is deliberately dumb — ask the gateway for a code, open the bot, poll until the
 * bot binds it. Tokens themselves live in `token-store` so the API layer and the SSE stream can
 * read them without going through React.
 */
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { useI18n, normalizeLanguage } from '@/i18n';
import { ApiError, onSessionExpired } from '@/services/api';
import { fetchCurrentUser, pollLogin, startLogin, type TelegramUser } from '@/services/auth-service';
import { clearIdentity, loadIdentity, setIdentity } from '@/services/identity-store';
import { clearTokens, getAccessToken, loadTokens } from '@/services/token-store';

export type LoginPhase = 'idle' | 'starting' | 'waiting' | 'error';

type AuthValue = {
  /** Null until the stored session has been read from the keychain. */
  ready: boolean;
  user: TelegramUser | null;
  isAuthenticated: boolean;
  loginPhase: LoginPhase;
  /** Deep link to open while `loginPhase === 'waiting'`. */
  deepLink: string | null;
  loginError: string | null;
  beginLogin: () => Promise<string | null>;
  /** Force an immediate check instead of waiting for the next poll tick. */
  checkLoginNow: () => void;
  cancelLogin: () => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

/** Header values have to be plain strings — the user document is not strongly typed upstream. */
function text(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { t, setLanguage } = useI18n();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [loginPhase, setLoginPhase] = useState<LoginPhase>('idle');
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  /** Handshake in flight: the code being polled, how often, and when it dies. */
  const codeRef = useRef<string | null>(null);
  const intervalRef = useRef(2000);
  const deadlineRef = useRef(0);
  const pollRef = useRef<() => void>(() => {});

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (pollTimer.current) clearTimeout(pollTimer.current);
      abortRef.current?.abort();
    };
  }, []);

  const applyUser = useCallback(
    (next: TelegramUser | null) => {
      setUser(next);

      const language = normalizeLanguage(next?.lang);
      if (language) setLanguage(language);

      // The gateway reads these off the headers of every later request.
      if (next) {
        setIdentity({
          telegramId: next.telegram_id == null ? null : String(next.telegram_id),
          name: text(next.telegram_name) || text(next.full_name),
          username: text(next.telegram_username),
          photoUrl: text(next.telegram_profile_photo),
        });
      }
    },
    [setLanguage]
  );

  // Restore the stored session once at boot; a stale access token is refreshed by the API layer.
  useEffect(() => {
    let cancelled = false;

    Promise.all([loadTokens(), loadIdentity()])
      .then(async () => {
        if (!getAccessToken()) return null;
        return fetchCurrentUser().catch(() => null);
      })
      .then((restored) => {
        if (!cancelled) applyUser(restored);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [applyUser]);

  useEffect(() => {
    const unsubscribe = onSessionExpired(() => {
      if (mounted.current) setUser(null);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    pollTimer.current = null;
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const cancelLogin = useCallback(() => {
    stopPolling();
    codeRef.current = null;
    setLoginPhase('idle');
    setDeepLink(null);
    setLoginError(null);
  }, [stopPolling]);

  /** One exchange attempt; schedules the next one while the code is still pending. */
  const poll = useCallback(async () => {
    const code = codeRef.current;
    const controller = abortRef.current;
    if (!code || !controller || controller.signal.aborted || !mounted.current) return;

    if (Date.now() > deadlineRef.current) {
      stopPolling();
      setLoginPhase('error');
      setLoginError(t('loginExpired'));
      return;
    }

    try {
      const authorized = await pollLogin(code, controller.signal);
      if (!mounted.current || controller.signal.aborted) return;

      if (authorized) {
        stopPolling();
        codeRef.current = null;
        applyUser(authorized);
        setLoginPhase('idle');
        setDeepLink(null);
        return;
      }
    } catch (error) {
      if (!mounted.current || controller.signal.aborted) return;

      stopPolling();
      setLoginPhase('error');
      setLoginError(
        error instanceof ApiError && error.status === 401 ? t('loginExpired') : t('loginFailed')
      );
      return;
    }

    if (pollTimer.current) clearTimeout(pollTimer.current);
    // Scheduled through the ref so the loop always runs the latest closure.
    pollTimer.current = setTimeout(() => pollRef.current(), intervalRef.current);
  }, [applyUser, stopPolling, t]);

  useEffect(() => {
    pollRef.current = poll;
  });

  /** Requests a code and starts polling. Returns the deep link the caller should open. */
  const beginLogin = useCallback(async () => {
    stopPolling();
    setLoginPhase('starting');
    setLoginError(null);

    let handshake;
    try {
      handshake = await startLogin();
    } catch {
      setLoginPhase('error');
      setLoginError(t('loginFailed'));
      return null;
    }

    codeRef.current = handshake.code;
    intervalRef.current = Math.max(1, handshake.poll_interval || 2) * 1000;
    deadlineRef.current = Date.now() + Math.max(60, handshake.expires_in || 300) * 1000;
    abortRef.current = new AbortController();

    setDeepLink(handshake.deep_link);
    setLoginPhase('waiting');

    pollTimer.current = setTimeout(poll, intervalRef.current);
    return handshake.deep_link;
  }, [poll, stopPolling, t]);

  /** "I pressed Start" — checks immediately instead of waiting for the next tick. */
  const checkLoginNow = useCallback(() => {
    if (!codeRef.current || !abortRef.current) return;
    if (pollTimer.current) clearTimeout(pollTimer.current);
    poll();
  }, [poll]);

  // Coming back from Telegram is the moment the code is most likely bound — check right away.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && codeRef.current) checkLoginNow();
    });
    return () => subscription.remove();
  }, [checkLoginNow]);

  const logout = useCallback(async () => {
    stopPolling();
    codeRef.current = null;
    await Promise.all([clearTokens(), clearIdentity()]);
    setUser(null);
    setLoginPhase('idle');
    setDeepLink(null);
  }, [stopPolling]);

  const value = useMemo<AuthValue>(
    () => ({
      ready,
      user,
      isAuthenticated: !!user,
      loginPhase,
      deepLink,
      loginError,
      beginLogin,
      checkLoginNow,
      cancelLogin,
      logout,
    }),
    [ready, user, loginPhase, deepLink, loginError, beginLogin, checkLoginNow, cancelLogin, logout]
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const value = use(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
