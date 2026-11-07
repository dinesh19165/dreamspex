export const SESSION_IDLE_TIMEOUT_MS = 60 * 60 * 1000;
export const LAST_ACTIVITY_STORAGE_KEY = 'dream-spex-last-activity';
const TOKEN_REFRESH_EARLY_MS = 60 * 1000;

export function getTokenExpiration(accessToken: string) {
  try {
    const payload = accessToken.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(globalThis.atob(base64)) as { exp?: unknown };
    return typeof claims.exp === 'number' ? claims.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function getLastActivityAt() {
  if (typeof window === 'undefined') return null;
  const timestamp = Number(window.localStorage.getItem(LAST_ACTIVITY_STORAGE_KEY));
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
}

export function recordUserActivity(now = Date.now()) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, String(now));
  }
}

export function scheduleIdleTimeout(
  readLastActivityAt: () => number,
  onExpire: () => void,
  timeout = SESSION_IDLE_TIMEOUT_MS,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  const checkIdle = () => {
    if (stopped) return;
    const remaining = readLastActivityAt() + timeout - Date.now();
    if (remaining <= 0) {
      onExpire();
      return;
    }
    timer = setTimeout(checkIdle, Math.min(remaining, 2_147_483_647));
  };
  checkIdle();
  return () => {
    stopped = true;
    if (timer !== undefined) clearTimeout(timer);
  };
}

export function scheduleAccessTokenRefresh(
  expiresAt: number,
  refresh: () => Promise<string | null>,
  onAuthenticationFailure: () => void,
  retryInterval = 15_000,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  const schedule = (delay: number) => {
    timer = setTimeout(() => { void run(); }, Math.max(0, delay));
  };
  const run = async () => {
    if (stopped) return;
    try {
      const accessToken = await refresh();
      if (!stopped && !accessToken) onAuthenticationFailure();
    } catch {
      if (stopped) return;
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) onAuthenticationFailure();
      else schedule(Math.min(retryInterval, remaining));
    }
  };
  schedule(Math.max(0, expiresAt - Date.now() - TOKEN_REFRESH_EARLY_MS));
  return () => {
    stopped = true;
    if (timer !== undefined) clearTimeout(timer);
  };
}
