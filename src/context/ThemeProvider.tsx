import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ThemeContext, type Theme } from './ThemeContext';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme] = useState<Theme>('light');

  useEffect(() => {
    document.documentElement.dataset.theme = 'light';
    try {
      window.localStorage.setItem('dream-spex-theme', 'light');
    } catch {
      // no-op
    }
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme: () => undefined }}>{children}</ThemeContext.Provider>;
}