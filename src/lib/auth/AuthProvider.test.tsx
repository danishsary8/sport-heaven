import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { API, server, setupMsw } from '../../test/msw';
import { apiFetch, configureApi } from '../api';
import { AuthProvider, useAuth } from './AuthProvider';
import { createAuthAdapter } from './createAdapter';
import { createTestAdapter } from './testAuth';

setupMsw();
configureApi({ baseUrl: API });

const USER = {
  id: '00000000-0000-4000-8000-000000000001',
  phone: '+85512345678',
  email: null,
  fullName: 'Sok Dara',
  photoUrl: null,
  role: 'customer',
  staffBranchId: null,
  homeBranchId: null,
  preferredBootSize: null,
  preferredJerseySize: null,
  phoneVerified: true,
  createdAt: '2026-11-26T00:00:00.000Z',
};

function Probe() {
  const { status, user, cartMerged, signOut } = useAuth();
  return (
    <div>
      <p data-testid="status">{status}</p>
      <p data-testid="name">{user?.fullName ?? ''}</p>
      <p data-testid="merged">{cartMerged ? String(cartMerged.mergedLines) : ''}</p>
      <button onClick={() => void signOut()}>out</button>
    </div>
  );
}

function wrap(children: ReactNode, client = new QueryClient()) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('AuthProvider', () => {
  it('starts as a guest when nobody is signed in', async () => {
    const adapter = createTestAdapter();
    render(wrap(<AuthProvider adapter={adapter}><Probe /></AuthProvider>));
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('guest'));
  });

  it('syncs the session after sign-in, shows the merged bag and refreshes the bag', async () => {
    let auth: string | null = null;
    server.use(
      http.post(`${API}/v1/auth/session`, ({ request }) => {
        auth = request.headers.get('authorization');
        return HttpResponse.json({ user: USER, created: false, cartMerged: { mergedLines: 2, cappedLines: 0 } });
      }),
    );
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const adapter = createTestAdapter();
    render(wrap(<AuthProvider adapter={adapter}><Probe /></AuthProvider>, client));
    await act(() => adapter.testSignIn!('test:u1:+85512345678:-:Sok Dara'));
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('member'));
    expect(screen.getByTestId('name').textContent).toBe('Sok Dara');
    expect(screen.getByTestId('merged').textContent).toBe('2');
    expect(auth).toBe('Bearer test:u1:+85512345678:-:Sok Dara');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['cart'] });
  });

  it('signs out after the API refuses a refreshed token, keeping catalog data', async () => {
    server.use(
      http.post(`${API}/v1/auth/session`, () => HttpResponse.json({ user: USER, created: false })),
      http.get(`${API}/v1/me`, () => HttpResponse.json({ error: { code: 'unauthenticated', message: 'x' } }, { status: 401 })),
    );
    const client = new QueryClient();
    client.setQueryData(['catalog', 'menu'], { ok: true });
    client.setQueryData(['me'], { secret: true });
    const adapter = createTestAdapter();
    render(wrap(<AuthProvider adapter={adapter}><Probe /></AuthProvider>, client));
    await act(() => adapter.testSignIn!('test:u2:-:-'));
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('member'));
    await expect(apiFetch('/v1/me')).rejects.toMatchObject({ code: 'unauthenticated' });
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('guest'));
    expect(client.getQueryData(['catalog', 'menu'])).toEqual({ ok: true });
    expect(client.getQueryData(['me'])).toBeUndefined();
  });

  it('signs out on request', async () => {
    server.use(http.post(`${API}/v1/auth/session`, () => HttpResponse.json({ user: USER, created: false })));
    const adapter = createTestAdapter();
    render(wrap(<AuthProvider adapter={adapter}><Probe /></AuthProvider>));
    await act(() => adapter.testSignIn!('test:u3:-:-'));
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('member'));
    await act(async () => screen.getByRole('button').click());
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('guest'));
    expect(await adapter.getToken()).toBeNull();
  });
});

describe('createAuthAdapter', () => {
  it('never uses test sign-in unless the build flag is on', () => {
    expect(createAuthAdapter({}).testSignIn).toBeUndefined();
    expect(createAuthAdapter({ VITE_AUTH_TEST_MODE: 'false' }).testSignIn).toBeUndefined();
    expect(createAuthAdapter({ VITE_AUTH_TEST_MODE: 'true' }).testSignIn).toBeTypeOf('function');
  });

  it('explains sign-in is unavailable when Firebase is not configured', async () => {
    const adapter = createAuthAdapter({});
    await expect(adapter.google()).rejects.toThrow(/not set up/);
  });
});

describe('AuthProvider resilience', () => {
  it('retries the session after a server blip instead of showing a guest', async () => {
    let n = 0;
    server.use(
      http.post(`${API}/v1/auth/session`, () => {
        n++;
        return n <= 2 ? HttpResponse.json({ error: { code: 'internal', message: 'busy' } }, { status: 503 }) : HttpResponse.json({ user: USER, created: false, cartMerged: null });
      }),
    );
    const adapter = createTestAdapter();
    render(wrap(<AuthProvider adapter={adapter}><Probe /></AuthProvider>));
    await act(() => adapter.testSignIn!('test:u1:+85512345678:-'));
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('member'), { timeout: 8000 });
    expect(n).toBeGreaterThanOrEqual(3);
  });

  it('drops member data when the sign-in ends elsewhere (another tab)', async () => {
    server.use(http.post(`${API}/v1/auth/session`, () => HttpResponse.json({ user: USER, created: false, cartMerged: null })));
    const client = new QueryClient();
    const adapter = createTestAdapter();
    render(wrap(<AuthProvider adapter={adapter}><Probe /></AuthProvider>, client));
    await act(() => adapter.testSignIn!('test:u1:+85512345678:-'));
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('member'));
    client.setQueryData(['me', 'addresses'], { addresses: [{ street: 'secret' }] });
    client.setQueryData(['catalog', 'menu', 'en'], { categories: [] });
    await act(() => adapter.signOut());
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('guest'));
    expect(client.getQueryData(['me', 'addresses'])).toBeUndefined();
    expect(client.getQueryData(['catalog', 'menu', 'en'])).toBeDefined();
  });
});
