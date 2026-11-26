import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../../../app/routes';
import { configureApi } from '../../../lib/api';
import { adminBase } from '../../../test/admin';
import { order } from '../../../test/fixtures';
import { API, server, setupMsw } from '../../../test/msw';
import { renderRoutes } from '../../../test/render';

setupMsw();

const ROW = { number: 'SC-2611-AAAAA', status: 'confirmed', paymentStatus: 'paid', paymentMethod: 'aba_khqr', fulfillment: 'delivery', contactName: 'Dara Sok', contactPhone: '+85512345678', totalCents: 9750, needsRefund: false, branches: ['sensok'], createdAt: '2026-11-26T08:00:00Z' };
const detail = (over: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) => ({
  order: order({ number: 'SC-2611-AAAAA', status: 'confirmed', paymentStatus: 'paid', ...over }),
  needsRefund: false,
  events: [{ at: '2026-11-26T08:00:00Z', from: null, to: 'pending_payment', kind: 'status', actor: 'customer', actorName: null, note: null }],
  payments: [{ attempt: 1, method: 'aba_khqr', status: 'approved', amountCents: 9750, tranId: 'T-1', createdAt: '2026-11-26T08:00:00Z', updatedAt: '2026-11-26T08:01:00Z' }],
  allocations: [{ orderItemId: 'i1', branchId: 'sensok', qty: 1 }],
  pickList: { sensok: [{ sku: 'SKU-1', name: 'Product 1', size: 'EU 41', color: 'Black', qty: 1, customPrint: null }] },
  ...extra,
});

let listQueries: URLSearchParams[] = [];
let posts: { path: string; body: unknown }[] = [];
let current = detail();

beforeEach(() => {
  listQueries = [];
  posts = [];
  current = detail();
  configureApi({ baseUrl: API });
  server.use(
    ...adminBase('staff'),
    http.get(`${API}/v1/admin/orders`, ({ request }) => {
      listQueries.push(new URL(request.url).searchParams);
      return HttpResponse.json({ orders: [ROW], total: 1, page: 1, pageSize: 25 });
    }),
    http.get(`${API}/v1/admin/orders/SC-2611-AAAAA`, () => HttpResponse.json(current)),
    http.post(`${API}/v1/admin/orders/SC-2611-AAAAA/:action`, async ({ request, params }) => {
      const body = await request.json();
      posts.push({ path: String(params.action), body });
      if (params.action === 'status') current = detail({ status: (body as { to: string }).to });
      if (params.action === 'cancel') current = detail({ status: 'cancelled' });
      if (params.action === 'collect-cash') current = detail({ status: 'completed', paymentStatus: 'paid' });
      if (params.action === 'notes') current = detail({}, { events: [...current.events, { at: '2026-11-26T09:00:00Z', from: null, to: null, kind: 'note', actor: 'staff', actorName: 'Vanna', note: (body as { note: string }).note }] });
      return HttpResponse.json(current);
    }),
  );
});

describe('admin orders', () => {
  it('filters by the status in the link and searches', async () => {
    renderRoutes(routes, '/admin/orders?status=confirmed', { signedIn: true });
    expect(await screen.findByRole('link', { name: /SC-2611-AAAAA/ })).toHaveAttribute('href', '/admin/orders/SC-2611-AAAAA');
    expect(listQueries[0]!.get('status')).toBe('confirmed');
    fireEvent.change(screen.getByLabelText('Search orders'), { target: { value: '012345678' } });
    fireEvent.submit(screen.getByRole('search'));
    await waitFor(() => expect(listQueries.some((q) => q.get('q') === '012345678')).toBe(true));
  });

  it('shows the pick list and payments, and moves the order on', async () => {
    renderRoutes(routes, '/admin/orders/SC-2611-AAAAA', { signedIn: true });
    const pick = await screen.findByRole('region', { name: 'Pick list' });
    expect(within(pick).getByText('SKU-1')).toBeTruthy();
    expect(screen.getByText('T-1')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Mark out for delivery' }));
    await waitFor(() => expect(posts).toEqual([{ path: 'status', body: { to: 'out_for_delivery' } }]));
    expect(await screen.findByRole('button', { name: 'Mark delivered' })).toBeTruthy();
  });

  it('cancels only with a reason', async () => {
    renderRoutes(routes, '/admin/orders/SC-2611-AAAAA', { signedIn: true });
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel order' }));
    const dialog = await screen.findByRole('dialog', { name: 'Cancel order SC-2611-AAAAA' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel the order' }));
    expect(await within(dialog).findByText('Write why the order is cancelled.')).toBeTruthy();
    fireEvent.change(within(dialog).getByLabelText('Reason'), { target: { value: 'Customer asked' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel the order' }));
    await waitFor(() => expect(posts).toEqual([{ path: 'cancel', body: { reason: 'Customer asked' } }]));
  });

  it('takes cash at the counter for a pickup order', async () => {
    current = detail({ status: 'ready_for_pickup', paymentStatus: 'unpaid', paymentMethod: 'cash_on_pickup', fulfillment: 'pickup', pickupBranch: { id: 'sensok', name: 'Sen Sok' } });
    renderRoutes(routes, '/admin/orders/SC-2611-AAAAA', { signedIn: true });
    fireEvent.click(await screen.findByRole('button', { name: /Take cash/ }));
    await waitFor(() => expect(posts.map((p) => p.path)).toEqual(['collect-cash']));
  });

  it('adds a staff note', async () => {
    renderRoutes(routes, '/admin/orders/SC-2611-AAAAA', { signedIn: true });
    fireEvent.change(await screen.findByLabelText('Add a note'), { target: { value: 'Called the customer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save note' }));
    expect(await screen.findByText('Called the customer')).toBeTruthy();
    expect(posts).toEqual([{ path: 'notes', body: { note: 'Called the customer' } }]);
  });
});
