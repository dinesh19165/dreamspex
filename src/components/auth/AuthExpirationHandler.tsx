import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { registerTokenRefreshHandler, registerUnauthorizedHandler } from '../../services/apiClient';
import { loginPathForRole } from '../../utils/authNavigation';
import {
  getLastActivityAt,
  getTokenExpiration,
  LAST_ACTIVITY_STORAGE_KEY,
  recordUserActivity,
  scheduleAccessTokenRefresh,
  scheduleIdleTimeout,
} from '../../utils/authExpiration';

export default function AuthExpirationHandler() {
  const { user, role, logout, refreshAccessToken } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const handlingExpiration = useRef(false);

  const expireSession = useCallback(() => {
    if (!user || handlingExpiration.current) return;
    handlingExpiration.current = true;
    const loginPath = loginPathForRole(role);
    const alreadyOnLoginPage = location.pathname === loginPath;
    const state = alreadyOnLoginPage
      ? undefined
      : { from: { pathname: location.pathname, search: location.search, hash: location.hash } };

    void logout().catch(() => {
      console.error('Unable to revoke the expired Dream Spex session.');
    });
    navigate(loginPath, { replace: true, state });
  }, [location.hash, location.pathname, location.search, logout, navigate, role, user]);

  useEffect(() => registerUnauthorizedHandler(expireSession), [expireSession]);
  useEffect(() => registerTokenRefreshHandler(refreshAccessToken), [refreshAccessToken]);

  useEffect(() => {
    if (!user) {
      handlingExpiration.current = false;
      return undefined;
    }

    if (!getLastActivityAt()) recordUserActivity();
    let stopIdleTimer = () => {};
    const resetIdleTimer = () => {
      stopIdleTimer();
      stopIdleTimer = scheduleIdleTimeout(
        () => getLastActivityAt() ?? Date.now(),
        expireSession,
      );
    };
    const recordActivity = (event: Event) => {
      if (!event.isTrusted) return;
      recordUserActivity();
      resetIdleTimer();
    };
    const syncActivity = (event: StorageEvent) => {
      if (event.key === LAST_ACTIVITY_STORAGE_KEY) resetIdleTimer();
    };

    resetIdleTimer();
    window.addEventListener('pointerdown', recordActivity, { passive: true });
    window.addEventListener('keydown', recordActivity);
    window.addEventListener('wheel', recordActivity, { passive: true });
    window.addEventListener('touchstart', recordActivity, { passive: true });
    window.addEventListener('storage', syncActivity);
    window.addEventListener('focus', resetIdleTimer);
    document.addEventListener('visibilitychange', resetIdleTimer);

    return () => {
      stopIdleTimer();
      window.removeEventListener('pointerdown', recordActivity);
      window.removeEventListener('keydown', recordActivity);
      window.removeEventListener('wheel', recordActivity);
      window.removeEventListener('touchstart', recordActivity);
      window.removeEventListener('storage', syncActivity);
      window.removeEventListener('focus', resetIdleTimer);
      document.removeEventListener('visibilitychange', resetIdleTimer);
    };
  }, [expireSession, user]);

  useEffect(() => {
    if (!user) return undefined;
    const expiresAt = user.accessTokenExpiresAt
      ?? (user.accessToken ? getTokenExpiration(user.accessToken) : null);
    if (expiresAt === null || !Number.isFinite(expiresAt) || !user.refreshToken) return undefined;

    const stopRefreshTimer = scheduleAccessTokenRefresh(
      expiresAt,
      refreshAccessToken,
      expireSession,
    );
    const refreshIfNeeded = () => {
      if (expiresAt - Date.now() > 60_000) return;
      void refreshAccessToken().then((token) => {
        if (!token) expireSession();
      }).catch(() => {
        if (Date.now() >= expiresAt) expireSession();
      });
    };
    window.addEventListener('focus', refreshIfNeeded);
    document.addEventListener('visibilitychange', refreshIfNeeded);
    return () => {
      stopRefreshTimer();
      window.removeEventListener('focus', refreshIfNeeded);
      document.removeEventListener('visibilitychange', refreshIfNeeded);
    };
  }, [expireSession, refreshAccessToken, user]);

  return null;
}
