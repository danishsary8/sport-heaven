import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../../app/routes';
import { configureApi } from '../../lib/api';
import { BRANCHES, MENU, MEMBER, cart, sessionFor } from '../../test/fixtures';
import { API, server, setupMsw } from '../../test/msw';
import { renderRoutes } from '../../test/render';

setupMsw();

let auths: (string | null)[] = [];
let merged: { mergedLines: number; cappedLines: number } | null = null;

beforeEach(() => {
  auths = [];
  merged = null;
  configureApi({ baseUrl: API });
  server.use(
    http.get(`${API}/v1/catalog/menu`, () => HttpResponse.json(MENU)),
    http.get(`${API}/v1/branches`, () => HttpResponse.json(BRANCHES)),
    http.get(`${API}/v1/cart`, () => HttpResponse.json(cart([]))),
    http.get(`${API}/v1/catalog/home`, () => HttpResponse.json({ sections: [] })),
    http.get(`${API}/v1/me`, () => HttpResponse.json({ user: MEMBER })),
    http.get(`${API}/v1/me/orders`, () => HttpResponse.json({ orders: [], nextCursor: null })),
    http.get(`${API}/v1/me/loyalty`, () => HttpResponse.json({ tier: 'bronze', points: 0, lifetimeSpendCents: 0, nextTier: null, history: [] })),
    http.post(`${API}/v1/auth/session`, ({ request }) => {
      auths.push(request.headers.get('authorization'));
      return HttpResponse.json({ ...sessionFor({ ...MEMBER, phone: '+85512345678' }), cartMerged: merged });
    }),
  );
});

async function signInWithPhone(code = '123456') {
  fireEvent.change(await screen.findByLabelText('Phone number'), { target: { value: '012 345 678' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
  fireEvent.change(await screen.findByLabelText('6-digit code'), { target: { value: code } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('sign in', () => {
  it('signs in with a phone code and returns to where the shopper came from', async () => {
    const { router } = renderRoutes(routes, '/sign-in', { state: { from: '/checkout' } });
    await signInWithPhone();
    await waitFor(() => expect(router.state.location.pathname).toBe('/checkout'));
    expect(auths[0]).toBe('Bearer test:phone-85512345678:+85512345678:-');
  });

  it('says when the code is wrong', async () => {
    renderRoutes(routes, '/sign-in');
    await signInWithPhone('000000');
    expect(await screen.findByText("That code isn't right. Check the SMS and try again.")).toBeTruthy();
    expect(auths).toEqual([]);
  });

  it('offers to continue as a guest when coming from checkout', async () => {
    renderRoutes(routes, '/sign-in', { state: { from: '/checkout' } });
    expect(await screen.findByRole('link', { name: 'Continue as a guest' })).toHaveAttribute('href', '/checkout');
  });

  it('tells the member their earlier bag was added', async () => {
    merged = { mergedLines: 2, cappedLines: 0 };
    renderRoutes(routes, '/sign-in');
    await signInWithPhone();
    expect(await screen.findByText('We added 2 items from your earlier bag.')).toBeTruthy();
  });

  it('sends a signed-in member straight to their account', async () => {
    const { router } = renderRoutes(routes, '/sign-in', { signedIn: true });
    await waitFor(() => expect(router.state.location.pathname).toBe('/account'));
  });
});
