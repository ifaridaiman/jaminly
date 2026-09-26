import { createContext, use, useState, type ReactNode } from 'react';

import { env } from '@/lib/env';

export type User = { id: string; email: string; name: string; avatarUrl?: string };

type Session = {
  user: User | null;
  signIn: () => Promise<void>;
  signOut: () => void;
};

const SessionContext = createContext<Session | null>(null);

const MOCK_USER: User = { id: 'mock-user', email: 'demo@jaminly.app', name: 'Demo User' };

export function SessionProvider({ children }: { children: ReactNode }) {
  // ponytail: in-memory session, lost on reload. Persist tokens (expo-secure-store) at M1.
  const [user, setUser] = useState<User | null>(null);

  async function signIn() {
    if (env.mockAuth) return setUser(MOCK_USER);
    throw new Error('Google sign-in is not configured yet. Set EXPO_PUBLIC_MOCK_AUTH=true.');
  }

  return (
    <SessionContext value={{ user, signIn, signOut: () => setUser(null) }}>
      {children}
    </SessionContext>
  );
}

export function useSession() {
  const session = use(SessionContext);
  if (!session) throw new Error('useSession must be used inside <SessionProvider>');
  return session;
}
