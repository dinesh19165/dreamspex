import { createContext } from 'react';

type AuthContextValue = {
  isAuthenticated: boolean;
  setAuthenticated: () => void;
  clearAuthenticated: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
