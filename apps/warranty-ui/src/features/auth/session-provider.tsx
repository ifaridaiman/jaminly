import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { unregisterPush } from '@/features/notifications/push';
import { api, onSessionEnded, type AuthSession, type User } from '@/lib/api';
import { storage } from '@/lib/storage';

export type SignInMethod = 'email' | 'google';

const METHOD_KEY = 'jaminly.signInMethod';

type Session = {
  user: User | null;
  /** True until the stored session has been restored (or found missing) on launch. */
  isLoading: boolean;
  method: SignInMethod | null;
  /** Email waiting for its verification code. Kept here, not in the URL, so it stays out of web history. */
  pendingEmail: string | null;
  setPendingEmail: (email: string | null) => void;
  /** Called with the result of login / verifyEmail / resetPassword / signInWithGoogle. */
  startSession: (session: AuthSession, method: SignInMethod) => void;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [method, setMethod] = useState<SignInMethod | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  useEffect(() => {
    // A refresh that fails mid-session (revoked elsewhere, account deleted) signs this device out.
    onSessionEnded(() => {
      setUser(null);
      setMethod(null);
    });
    Promise.all([api.restoreSession(), storage.get(METHOD_KEY)])
      .then(([session, how]) => {
        if (!session) return;
        setUser(session.user);
        setMethod(how === 'google' ? 'google' : 'email');
      })
      .finally(() => setIsLoading(false));
  }, []);

  function startSession(session: AuthSession, how: SignInMethod) {
    setUser(session.user);
    setMethod(how);
    setPendingEmail(null);
    void storage.set(METHOD_KEY, how);
  }

  async function signOut() {
    await unregisterPush(); // needs the access token, so before logout
    setUser(null);
    setMethod(null);
    await Promise.all([api.logout(), storage.remove(METHOD_KEY)]);
  }

  return (
    <SessionContext value={{ user, isLoading, method, pendingEmail, setPendingEmail, startSession, signOut }}>
      {children}
    </SessionContext>
  );
}

export function useSession() {
  const session = use(SessionContext);
  if (!session) throw new Error('useSession must be used inside <SessionProvider>');
  return session;
}
