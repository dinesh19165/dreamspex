import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { mockCustomerUser, mockFranchiseUsers, mockSuperAdminUser } from '../data/mockAuth';
import { AuthContext, type AuthRole, type AuthUser } from './AuthContext';
import { authService, AuthApiError } from '../services/authService';
import { cancelAuthenticatedRequests } from '../services/apiClient';
import {
  getTokenExpiration,
  LAST_ACTIVITY_STORAGE_KEY,
  recordUserActivity,
} from '../utils/authExpiration';

const STORAGE_KEY = 'dream-spex-auth-session';
const SESSION_KEYS = ['dream-spex-auth-session', 'dream-spex-remember-me', 'dream-spex-admin-session', 'dream-spex-franchise-session'];
const REFRESH_LOCK_KEY = 'dream-spex-auth-refresh-lock';

function clearFrontendSession() {
  if (typeof window === 'undefined') return;

  window.localStorage.removeItem(STORAGE_KEY);
  window.sessionStorage.removeItem('dream-spex-auth-session');

  SESSION_KEYS.forEach((key) => {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  });
  window.localStorage.removeItem(LAST_ACTIVITY_STORAGE_KEY);
}

function persistFrontendSession(user: AuthUser) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }
}

function readSession(): AuthUser | null {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function getFranchiseUserById(franchiseId?: string) {
  return mockFranchiseUsers.find((user) => user.franchiseId === franchiseId) ?? mockFranchiseUsers[0];
}

async function withRefreshLock<T>(operation: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request(REFRESH_LOCK_KEY, operation);
  }

  const lockOwner = `${Date.now()}-${Math.random()}`;
  const lockExpiry = Date.now() + 60_000;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const currentExpiry = Number(window.localStorage.getItem(REFRESH_LOCK_KEY)?.split(':')[1]);
    if (!Number.isFinite(currentExpiry) || currentExpiry <= Date.now()) {
      window.localStorage.setItem(REFRESH_LOCK_KEY, `${lockOwner}:${lockExpiry}`);
      if (window.localStorage.getItem(REFRESH_LOCK_KEY) === `${lockOwner}:${lockExpiry}`) {
        try {
          return await operation();
        } finally {
          if (window.localStorage.getItem(REFRESH_LOCK_KEY) === `${lockOwner}:${lockExpiry}`) {
            window.localStorage.removeItem(REFRESH_LOCK_KEY);
          }
        }
      }
    }
    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }
  throw new Error('Unable to coordinate a secure session refresh across browser tabs.');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readSession());
  const sessionGeneration = useRef(0);
  const refreshInFlight = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    const syncSession = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      if (!event.newValue) {
        sessionGeneration.current += 1;
        cancelAuthenticatedRequests();
        setUser(null);
        return;
      }
      try {
        setUser(JSON.parse(event.newValue) as AuthUser);
      } catch {
        clearFrontendSession();
        setUser(null);
      }
    };
    window.addEventListener('storage', syncSession);
    return () => window.removeEventListener('storage', syncSession);
  }, []);

  useEffect(() => {
    if (user) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      return;
    }

    clearFrontendSession();
  }, [user]);

  const setAuthenticated = (role: AuthRole = 'CUSTOMER', overrides: Partial<AuthUser> = {}) => {
    const nextUser = role === 'FRANCHISE_ADMIN'
      ? getFranchiseUserById('DS-HYD-001')
      : role === 'SUPER_ADMIN'
        ? mockSuperAdminUser
        : mockCustomerUser;
    sessionGeneration.current += 1;
    recordUserActivity();
    const authenticatedUser = { ...nextUser, ...overrides };
    persistFrontendSession(authenticatedUser);
    setUser(authenticatedUser);
  };

  const loginAsCustomer = () => {
    sessionGeneration.current += 1;
    recordUserActivity();
    persistFrontendSession(mockCustomerUser);
    setUser(mockCustomerUser);
  };
  const loginAsFranchiseAdmin = (franchiseId = 'DS-HYD-001') => {
    sessionGeneration.current += 1;
    recordUserActivity();
    const franchiseUser = getFranchiseUserById(franchiseId);
    persistFrontendSession(franchiseUser);
    setUser(franchiseUser);
  };
  const loginAsSuperAdmin = () => {
    sessionGeneration.current += 1;
    recordUserActivity();
    persistFrontendSession(mockSuperAdminUser);
    setUser(mockSuperAdminUser);
  };
  const clearAuthenticated = () => {
    sessionGeneration.current += 1;
    cancelAuthenticatedRequests();
    clearFrontendSession();
    setUser(null);
  };
  const refreshAccessToken = useCallback((rejectedAccessToken?: string) => {
    if (refreshInFlight.current) return refreshInFlight.current;

    const generation = sessionGeneration.current;
    const refresh = withRefreshLock(async () => {
      const current = readSession();
      if (!current?.refreshToken) return null;

      const currentExpiresAt = current.accessTokenExpiresAt
        ?? (current.accessToken ? getTokenExpiration(current.accessToken) : null);
      if (current.accessToken && current.accessToken !== rejectedAccessToken
          && currentExpiresAt && currentExpiresAt > Date.now() + 60_000) {
        setUser(current);
        return current.accessToken;
      }

      let response;
      try {
        response = await authService.refresh(current.refreshToken);
      } catch (reason) {
        if (reason instanceof AuthApiError && reason.status === 401) {
          if (generation === sessionGeneration.current) {
            sessionGeneration.current += 1;
            cancelAuthenticatedRequests();
            clearFrontendSession();
            setUser(null);
          }
          return null;
        }
        throw reason;
      }
      if (generation !== sessionGeneration.current) return null;

      const role = response.user.roles.includes('SUPER_ADMIN')
        ? 'SUPER_ADMIN'
        : response.user.roles.includes('FRANCHISE_ADMIN')
          ? 'FRANCHISE_ADMIN'
          : 'CUSTOMER';
      const nextUser: AuthUser = {
        ...current,
        id: response.user.id,
        name: response.user.displayName,
        email: response.user.email ?? '',
        role,
        accessToken: response.accessToken,
        accessTokenExpiresAt: getTokenExpiration(response.accessToken) ?? Date.now() + response.expiresIn * 1000,
        refreshToken: response.refreshToken,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
      setUser(nextUser);
      return response.accessToken;
    });

    refreshInFlight.current = refresh;
    void refresh.finally(() => {
      if (refreshInFlight.current === refresh) refreshInFlight.current = null;
    }).catch(() => undefined);
    return refresh;
  }, []);
  const refreshSession = useCallback(async () => {
    try {
      return Boolean(await refreshAccessToken(user?.accessToken));
    } catch {
      return false;
    }
  }, [refreshAccessToken, user?.accessToken]);
  const logout = useCallback(async () => {
    const refreshToken = user?.refreshToken;
    sessionGeneration.current += 1;
    cancelAuthenticatedRequests();
    clearFrontendSession();
    setUser(null);
    if (refreshToken) await authService.logout(refreshToken);
  }, [user?.refreshToken]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: Boolean(user),
        role: user?.role ?? null,
        user,
        setAuthenticated,
        loginAsCustomer,
        loginAsFranchiseAdmin,
        loginAsSuperAdmin,
        clearAuthenticated,
        logout,
        refreshAccessToken,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
