import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { apiFetch, configureApi } from '../api';
import type { AuthAdapter, SessionResponse, SessionUser } from './types';

type Status = 'loading' | 'guest' | 'member';
type CartMerged = NonNullable<SessionResponse['cartMerged']>;

interface AuthValue {
  status: Status;
  user: SessionUser | null;
  cartMerged: CartMerged | null;
  adapter: AuthAdapter;
  /** Re-reads the session (e.g. after linking a phone or editing the profile). */
  refresh(): Promise<void>;
  signOut(): Promise<void>;
  clearCartMerged(): void;
}

const AuthContext = createContext<AuthValue | null>(null);

/** Queries that are the same for everyone and survive sign-out. */
const PUBLIC_KEYS = new Set(['catalog', 'branches', 'geo', 'search']);

export function AuthProvider({ adapter, children }: { adapter: AuthAdapter; children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [cartMerged, setCartMerged] = useState<CartMerged | null>(null);
  const syncing = useRef(0);

  const dropPrivate = useCallback(() => {
    queryClient.removeQueries({ predicate: (q) => !PUBLIC_KEYS.has(String(q.queryKey[0])) });
  }, [queryClient]);

  const signOut = useCallback(async () => {
    await adapter.signOut();
    setUser(null);
    setStatus('guest');
    dropPrivate();
  }, [adapter, dropPrivate]);

  const sync = useCallback(async () => {
    const id = ++syncing.current;
    try {
      const session = await apiFetch<SessionResponse>('/v1/auth/session', { method: 'POST' });
      if (id !== syncing.current) return;
      setUser(session.user);
      setStatus('member');
      if (session.cartMerged && session.cartMerged.mergedLines > 0) setCartMerged(session.cartMerged);
      await queryClient.invalidateQueries({ queryKey: ['cart'] });
    } catch {
      if (id !== syncing.current) return;
      // The API refused the account (or is down): browse as a guest rather than show a half signed-in shop.
      setUser(null);
      setStatus('guest');
    }
  }, [queryClient]);

  useEffect(() => {
    configureApi({ getToken: (force) => adapter.getToken(force), onUnauthorized: () => void signOut() });
  }, [adapter, signOut]);

  useEffect(
    () =>
      adapter.onChange((signedIn) => {
        if (signedIn) void sync();
        else {
          syncing.current++;
          setUser(null);
          setStatus('guest');
        }
      }),
    [adapter, sync],
  );

  const value = useMemo<AuthValue>(
    () => ({ status, user, cartMerged, adapter, refresh: sync, signOut, clearCartMerged: () => setCartMerged(null) }),
    [status, user, cartMerged, adapter, sync, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
