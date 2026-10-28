import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { ThemeContext, type Theme } from './ThemeContext';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme: Theme = 'light';

  useEffect(() => {
    document.documentElement.dataset.theme = 'light';
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme: () => undefined }}>{children}</ThemeContext.Provider>;
}