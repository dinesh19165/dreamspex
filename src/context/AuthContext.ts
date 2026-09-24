import { createContext } from 'react';

export type AuthRole = 'CUSTOMER' | 'FRANCHISE_ADMIN' | 'SUPER_ADMIN';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
  franchiseId?: string;
  franchiseName?: string;
  city?: string;
  state?: string;
};

type AuthContextValue = {
  isAuthenticated: boolean;
  role: AuthRole | null;
  user: AuthUser | null;
  setAuthenticated: (role?: AuthRole) => void;
  loginAsCustomer: () => void;
  loginAsFranchiseAdmin: (franchiseId?: string) => void;
  loginAsSuperAdmin: () => void;
  clearAuthenticated: () => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
