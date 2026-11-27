import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../../app/routes';
import { configureApi } from '../../lib/api';
import { ADDRESS, BRANCHES, GEO, MENU, MEMBER, cart, order, product, sessionFor } from '../../test/fixtures';
import { API, server, setupMsw } from '../../test/msw';
import { renderRoutes } from '../../test/render';

setupMsw();

const LOYALTY = {
  pointsBalance: 1250,
  tier: 'gold',
  lifetimeSpendCents: 32000,
  nextTier: { id: 'pro', minSpendCents: 50000, remainingCents: 18000 },
  perks: { memberDiscountPercent: 10, memberDiscountCategories: ['boots'], freeDelivery: ['pp_rider'], freePrinting: false },
  pointsPerUsd: 10,
  phoneVerified: true,
  ledger: [{ delta: 950, reason: 'order', note: null, createdAt: '2026-11-20T00:00:00Z', orderNumber: 'SC-2611-AAAAA' }],
};
const SUMMARY = { number: 'SC-2611-AAAAA', status: 'delivered', paymentStatus: 'paid', fulfillment: 'delivery', totalCents: 9750, itemCount: 1, firstItem: { name: 'Product 1', imageUrl: null }, createdAt: '2026-11-20T00:00:00Z' };
const DELIVERED = order({
  number: 'SC-2611-AAAAA',
  status: 'delivered',
  paymentStatus: 'paid',
  deliveredAt: '2026-11-21T00:00:00Z',
  returnWindow: { exchangeUntil: '2026-12-21T00:00:00Z', refundUntil: '2026-12-05T00:00:00Z' },
  items: [{ ...order().items[0], id: '9b9b9b9b-1111-4111-8111-111111111111', returnableQty: 1 }],
});

let calls: { method: string; path: string; body?: unknown }[] = [];
const record = async (request: Request, path: string) => {
  const text = await request.text();
  calls.push({ method: request.method, path, body: text ? JSON.parse(text) : undefined });
};

beforeEach(() => {
  calls = [];
  configureApi({ baseUrl: API });
  server.use(
    http.get(`${API}/v1/catalog/menu`, () => HttpResponse.json(MENU)),
    http.get(`${API}/v1/branches`, () => HttpResponse.json(BRANCHES)),
    http.get(`${API}/v1/cart`, () => HttpResponse.json(cart([]))),
    http.get(`${API}/v1/catalog/home`, () => HttpResponse.json({ sections: [] })),
    http.post(`${API}/v1/auth/session`, () => HttpResponse.json(sessionFor())),
    http.get(`${API}/v1/me`, () => HttpResponse.json({ user: { ...MEMBER, photoUrl: null, homeBranchId: null, preferredBootSize: null, preferredJerseySize: null, createdAt: '2026-01-01T00:00:00Z' } })),
    http.patch(`${API}/v1/me`, async ({ request }) => {
      await record(request, '/me');
      return HttpResponse.json({ user: MEMBER });
    }),
    http.delete(`${API}/v1/me`, async ({ request }) => {
      await record(request, '/me');
      return new HttpResponse(null, { status: 204 });
    }),
    http.get(`${API}/v1/me/loyalty`, () => HttpResponse.json(LOYALTY)),
    http.get(`${API}/v1/me/orders`, () => HttpResponse.json({ orders: [SUMMARY], total: 1, page: 1, pageSize: 20 })),
    http.get(`${API}/v1/me/orders/SC-2611-AAAAA`, () =>
      HttpResponse.json({ order: calls.some((c) => c.path === '/me/returns') ? { ...DELIVERED, items: DELIVERED.items.map((i) => ({ ...i, returnableQty: 0 })) } : DELIVERED, payment: null }),
    ),
    http.get(`${API}/v1/me/addresses`, () => HttpResponse.json({ addresses: [ADDRESS] })),
    http.post(`${API}/v1/me/addresses`, async ({ request }) => {
      await record(request, '/me/addresses');
      return HttpResponse.json({ address: ADDRESS }, { status: 201 });
    }),
    http.delete(`${API}/v1/me/addresses/:id`, async ({ request, params }) => {
      await record(request, `/me/addresses/${params.id}`);
      return new HttpResponse(null, { status: 204 });
    }),
    http.get(`${API}/v1/geo/provinces`, () => HttpResponse.json(GEO.provinces)),
    http.get(`${API}/v1/geo/districts`, () => HttpResponse.json(GEO.districts)),
    http.get(`${API}/v1/geo/communes`, () => HttpResponse.json(GEO.communes)),
    http.get(`${API}/v1/me/returns`, () => HttpResponse.json({ returns: [] })),
    http.post(`${API}/v1/me/returns`, async ({ request }) => {
      await record(request, '/me/returns');
      return HttpResponse.json({ return: { number: 'RMA-1' } }, { status: 201 });
    }),
    http.get(`${API}/v1/me/wishlist`, () => HttpResponse.json({ products: [product(5, { name: 'Saved boot' })] })),
    http.delete(`${API}/v1/me/wishlist/:slug`, async ({ request, params }) => {
      await record(request, `/me/wishlist/${params.slug}`);
      return new HttpResponse(null, { status: 204 });
    }),
  );
});

describe('account', () => {
  it('sends guests to sign in', async () => {
    const { router } = renderRoutes(routes, '/account/orders');
    await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'));
  });

  it('greets the member with points, tier and recent orders', async () => {
    renderRoutes(routes, '/account', { signedIn: true });
    expect(await screen.findByRole('heading', { level: 1, name: 'Hello, Dara' })).toBeTruthy();
    expect(await screen.findByText('1,250 points')).toBeTruthy();
    expect(screen.getAllByText('Gold member').length).toBeGreaterThan(0);
    expect(await screen.findByRole('link', { name: /SC-2611-AAAAA/ })).toHaveAttribute('href', '/account/orders/SC-2611-AAAAA');
  });

  it('saves the profile', async () => {
    renderRoutes(routes, '/account/profile', { signedIn: true });
    const name = await screen.findByLabelText('Full name');
    await waitFor(() => expect(name).toHaveValue('Dara Sok'));
    fireEvent.change(name, { target: { value: 'Dara S.' } });
    fireEvent.change(screen.getByLabelText('Jersey size'), { target: { value: 'M' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(calls).toContainEqual({ method: 'PATCH', path: '/me', body: { fullName: 'Dara S.', preferredJerseySize: 'M' } }));
    expect(await screen.findByText('Profile saved')).toBeTruthy();
  });

  it('deletes the account after asking and signs out', async () => {
    const { router } = renderRoutes(routes, '/account/profile', { signedIn: true });
    fireEvent.click(await screen.findByRole('button', { name: 'Delete my account' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete your account?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete my account' }));
    await waitFor(() => expect(calls).toContainEqual({ method: 'DELETE', path: '/me', body: undefined }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });

  it('keeps the address form in the sheet while it slides closed', async () => {
    renderRoutes(routes, '/account/addresses', { signedIn: true });
    fireEvent.click(await screen.findByRole('button', { name: 'Add an address' }));
    await screen.findByRole('dialog', { name: 'New address' });
    fireEvent.keyDown(document, { key: 'Escape' });
    const leaving = document.querySelector('[data-sheet="closing"]')!;
    expect(leaving).toHaveTextContent('New address');
    expect(leaving.querySelector('input')).toBeTruthy();
  });

  it('adds and removes addresses', async () => {
    renderRoutes(routes, '/account/addresses', { signedIn: true });
    expect(await screen.findByText('St 51, house 12')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Add an address' }));
    const dialog = await screen.findByRole('dialog', { name: 'New address' });
    fireEvent.change(within(dialog).getByLabelText('Name for this address'), { target: { value: 'Work' } });
    fireEvent.change(within(dialog).getByLabelText('Recipient name'), { target: { value: 'Dara' } });
    fireEvent.change(within(dialog).getByLabelText('Recipient phone'), { target: { value: '012345678' } });
    await within(dialog).findByRole('option', { name: 'Phnom Penh' });
    fireEvent.change(within(dialog).getByLabelText('Province or city'), { target: { value: '12' } });
    await within(dialog).findByRole('option', { name: 'Chamkar Mon' });
    fireEvent.change(within(dialog).getByLabelText('District'), { target: { value: '1201' } });
    await within(dialog).findByRole('option', { name: 'Tonle Bassac' });
    fireEvent.change(within(dialog).getByLabelText('Commune'), { target: { value: '120101' } });
    fireEvent.change(within(dialog).getByLabelText('Street, house and floor'), { target: { value: 'St 63' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save address' }));
    await waitFor(() =>
      expect(calls).toContainEqual({ method: 'POST', path: '/me/addresses', body: { label: 'Work', recipientName: 'Dara', phone: '012345678', provinceCode: '12', districtCode: '1201', communeCode: '120101', street: 'St 63', landmark: null } }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete Home' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE' && c.path === `/me/addresses/${ADDRESS.id}`)).toBe(true));
  });

  it('shows an order and starts a return for a delivered item', async () => {
    const { router } = renderRoutes(routes, '/account/orders', { signedIn: true });
    fireEvent.click(await screen.findByRole('link', { name: /SC-2611-AAAAA/ }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Order SC-2611-AAAAA' })).toBeTruthy();
    fireEvent.click(screen.getByRole('link', { name: 'Start a return' }));
    await waitFor(() => expect(router.state.location.pathname + router.state.location.search).toBe('/account/returns/new?order=SC-2611-AAAAA'));
    fireEvent.click(await screen.findByRole('checkbox', { name: /Product 1/ }));
    fireEvent.change(screen.getByLabelText('Why are you returning it?'), { target: { value: 'Too small' } });
    fireEvent.click(screen.getByRole('radio', { name: /Refund/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Send return request' }));
    await waitFor(() =>
      expect(calls).toContainEqual({ method: 'POST', path: '/me/returns', body: { orderNumber: 'SC-2611-AAAAA', resolution: 'refund', items: [{ orderItemId: '9b9b9b9b-1111-4111-8111-111111111111', qty: 1, reason: 'Too small' }] } }),
    );
    expect(await screen.findByText(/We got your return request/)).toBeTruthy();
  });

  it('cancels an unpaid order from the account and shows it cancelled', async () => {
    let cancelled = false;
    server.use(
      http.get(`${API}/v1/me/orders/SC-2611-BBBBB`, () => HttpResponse.json({ order: order({ number: 'SC-2611-BBBBB', status: cancelled ? 'cancelled' : 'pending_payment' }), payment: null })),
      http.post(`${API}/v1/orders/SC-2611-BBBBB/cancel`, () => {
        cancelled = true;
        return HttpResponse.json({ order: order({ number: 'SC-2611-BBBBB', status: 'cancelled' }), payment: null });
      }),
    );
    renderRoutes(routes, '/account/orders/SC-2611-BBBBB', { signedIn: true, staleTime: 30_000 });
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel order' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Cancel this order?' })).getByRole('button', { name: 'Yes, cancel it' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Cancel order' })).toBeNull());
    expect(screen.getAllByText('Cancelled').length).toBeGreaterThan(0);
  });

  it('lists the wishlist and removes an item', async () => {
    renderRoutes(routes, '/account/wishlist', { signedIn: true });
    expect(await screen.findByRole('link', { name: /Saved boot/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Saved boot from your wishlist' }));
    await waitFor(() => expect(calls).toContainEqual({ method: 'DELETE', path: '/me/wishlist/product-5', body: undefined }));
  });

  it('shows points, the next tier and the history', async () => {
    renderRoutes(routes, '/account/points', { signedIn: true });
    expect(await screen.findByText('1,250 points')).toBeTruthy();
    expect(screen.getByText('Spend $180.00 more to reach Pro.')).toBeTruthy();
    expect(screen.getByText('+950')).toBeTruthy();
  });
});
