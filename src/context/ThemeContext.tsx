import { createContext } from 'react';

export type Theme = 'light';

export type ThemeContextValue = {
  theme: Theme;
};

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
