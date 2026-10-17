import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { ThemeContext, type Theme } from './ThemeContext';

const STORAGE_KEY = 'dream-spex-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme: Theme = 'light';

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, []);

  return <ThemeContext.Provider value={{ theme }}>{children}</ThemeContext.Provider>;
}