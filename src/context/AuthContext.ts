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
  accessToken?: string;
  accessTokenExpiresAt?: number;
  refreshToken?: string;
};

type AuthContextValue = {
  isAuthenticated: boolean;
  role: AuthRole | null;
  user: AuthUser | null;
  setAuthenticated: (role?: AuthRole, user?: Partial<AuthUser>) => void;
  loginAsCustomer: () => void;
  loginAsFranchiseAdmin: (franchiseId?: string) => void;
  loginAsSuperAdmin: () => void;
  clearAuthenticated: () => void;
  logout: () => Promise<void>;
  refreshAccessToken: (rejectedAccessToken?: string) => Promise<string | null>;
  refreshSession: () => Promise<boolean>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
