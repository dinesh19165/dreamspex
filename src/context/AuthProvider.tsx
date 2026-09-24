import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { mockCustomerUser, mockFranchiseUsers, mockSuperAdminUser } from '../data/mockAuth';
import { AuthContext, type AuthRole, type AuthUser } from './AuthContext';

const STORAGE_KEY = 'dream-spex-auth-session';
const SESSION_KEYS = ['dream-spex-auth-session', 'dream-spex-remember-me', 'dream-spex-admin-session', 'dream-spex-franchise-session'];

function clearFrontendSession() {
  if (typeof window === 'undefined') return;

  window.localStorage.removeItem(STORAGE_KEY);
  window.sessionStorage.removeItem('dream-spex-auth-session');

  SESSION_KEYS.forEach((key) => {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  });
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readSession());

  useEffect(() => {
    if (user) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      return;
    }

    clearFrontendSession();
  }, [user]);

  const setAuthenticated = (role: AuthRole = 'CUSTOMER') => {
    const nextUser = role === 'FRANCHISE_ADMIN'
      ? getFranchiseUserById('DS-HYD-001')
      : role === 'SUPER_ADMIN'
        ? mockSuperAdminUser
        : mockCustomerUser;
    setUser(nextUser);
  };

  const loginAsCustomer = () => setUser(mockCustomerUser);
  const loginAsFranchiseAdmin = (franchiseId = 'DS-HYD-001') => setUser(getFranchiseUserById(franchiseId));
  const loginAsSuperAdmin = () => setUser(mockSuperAdminUser);
  const clearAuthenticated = () => setUser(null);
  const logout = () => {
    setUser(null);
    clearFrontendSession();
  };

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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
