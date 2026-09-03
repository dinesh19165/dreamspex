import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ThemeContext, type Theme } from './ThemeContext';

const STORAGE_KEY = 'dream-spex-theme';

function getInitialTheme(): Theme {
  return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem(STORAGE_KEY, theme); }, [theme]);
  const toggleTheme = () => setTheme((current) => current === 'dark' ? 'light' : 'dark');
  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}