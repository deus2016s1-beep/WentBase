import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { AuthUser, UserRole } from '../types/auth';

type AuthContextValue = {
  user: AuthUser | null;
  login: (role: UserRole) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'windbase_user_role';

const getInitialUser = (): AuthUser | null => {
  const storedRole = localStorage.getItem(STORAGE_KEY);
  if (storedRole === 'admin' || storedRole === 'viewer') {
    return { name: storedRole === 'admin' ? 'Камал' : 'Руслан', role: storedRole };
  }
  return null;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(getInitialUser);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      login: (role: UserRole) => {
        localStorage.setItem(STORAGE_KEY, role);
        setUser({ name: role === 'admin' ? 'Камал' : 'Руслан', role });
      },
      logout: () => {
        localStorage.removeItem(STORAGE_KEY);
        setUser(null);
      }
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
