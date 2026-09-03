import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AuthContext } from './AuthContext';

const STORAGE_KEY = 'dream-spex-authenticated';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true');

  useEffect(() => {
    if (isAuthenticated) localStorage.setItem(STORAGE_KEY, 'true');
    else localStorage.removeItem(STORAGE_KEY);
  }, [isAuthenticated]);

  const setAuthenticated = () => setIsAuthenticated(true);
  const clearAuthenticated = () => setIsAuthenticated(false);

  return <AuthContext.Provider value={{ isAuthenticated, setAuthenticated, clearAuthenticated }}>{children}</AuthContext.Provider>;
}
