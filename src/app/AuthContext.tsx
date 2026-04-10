import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { AuthUser, UserRole } from '../types/auth';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type ProfileRow = {
  id: string;
  full_name: string;
  role: UserRole;
};

const buildAuthUser = (session: Session, profile: ProfileRow): AuthUser => ({
  id: session.user.id,
  email: session.user.email ?? '',
  fullName: profile.full_name,
  role: profile.role
});

const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as ProfileRow;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        setUser(null);
        setLoading(false);
        return;
      }

      const profile = await getProfile(session.user.id);
      setUser(profile ? buildAuthUser(session, profile) : null);
      setLoading(false);
    };

    void bootstrap();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
        return;
      }

      void getProfile(session.user.id).then((profile) => {
        setUser(profile ? buildAuthUser(session, profile) : null);
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      logout: async () => {
        await supabase.auth.signOut();
        setUser(null);
      }
    }),
    [loading, user]
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
