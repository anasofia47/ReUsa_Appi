import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { publicApi, session } from '@/services/api';
import { createAuthService } from '@/services/auth/auth-service';
import type { Role, Sex, User } from '@/types';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (
    name: string,
    email: string,
    password: string,
    sex?: Sex,
    role?: Role,
    supervisorSecret?: string,
  ) => Promise<User>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const authService = createAuthService(publicApi, session);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let active = true;
    const unsubscribe = session.subscribe((next) => {
      setUser(next);
      setStatus(next ? 'signedIn' : 'signedOut');
    });

    session.restore().then((restored) => {
      if (!active) return;
      setUser(restored);
      setStatus(restored ? 'signedIn' : 'signedOut');
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    return await authService.signIn(email, password);
  }, []);

  const signUp = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      sex?: Sex,
      role?: Role,
      supervisorSecret?: string,
    ) => {
      return await authService.signUp(name, email, password, sex, role, supervisorSecret);
    },
    [],
  );

  const signOut = useCallback(() => authService.signOut(), []);

  const value = useMemo(
    () => ({ status, user, signIn, signUp, signOut }),
    [status, user, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
