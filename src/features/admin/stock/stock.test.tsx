import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../../../app/routes';
import { configureApi } from '../../../lib/api';
import { adminBase } from '../../../test/admin';
import { API, server, setupMsw } from '../../../test/msw';
import { renderRoutes } from '../../../test/render';

setupMsw();

const V41 = '0dab0bf9-581e-49c2-bb39-36adf6797122';
const size = (id: string, label: string, onHand: number, reserved: number, extra: Partial<{ needsCount: boolean; low: boolean }> = {}) => ({
  id, sku: `PRED-${label.replace(' ', '')}`, size: label, color: 'Red', branchId: 'sensok', onHand, reserved, available: onHand - reserved, needsCount: false, low: false, ...extra,
});
const LIST = {
  branchId: 'sensok',
  view: 'all',
  page: 1,
  pageSize: 20,
  total: 1,
  counts: { all: 1, low: 1, out: 0, count: 1 },
  products: [
    {
      id: 'p1',
      slug: 'predator',
      name: 'Predator Elite FG',
      status: 'active',
      category: 'Football Boots',
      imageUrl: null,
      variants: [size('60981c81-5e86-4baf-84e2-cddd1b9083db', 'EU 40', 7, 0), size(V41, 'EU 41', 2, 1, { low: true, needsCount: true })],
    },
  ],
};

let lists: URLSearchParams[] = [];
let posts: { path: string; body: unknown }[] = [];

beforeEach(() => {
  lists = [];
  posts = [];
  configureApi({ baseUrl: API });
  server.use(
    ...adminBase('staff'),
    http.get(`${API}/v1/admin/stock/list`, ({ request }) => {
      lists.push(new URL(request.url).searchParams);
      return HttpResponse.json(LIST);
    }),
    http.get(`${API}/v1/admin/stock/movements`, () =>
      HttpResponse.json({ movements: [{ id: '1', branchId: 'sensok', deltaOnHand: -1, deltaReserved: 0, reason: 'counter_sale', refId: 'S-1', note: null, actorUserId: 'u1', createdAt: '2026-11-26T08:00:00Z' }] }),
    ),
    http.post(`${API}/v1/admin/stock/:action`, async ({ request, params }) => {
      const body = await request.json();
      posts.push({ path: String(params.action), body });
      return HttpResponse.json(params.action === 'sale' ? { saleId: 'S-2', lines: [] } : { stock: {}, delta: 1 });
    }),
  );
});

async function open(path = '/admin/stock') {
  renderRoutes(routes, path, { signedIn: true });
  return screen.findByRole('row', { name: /EU 41/ });
}

describe('stock screen', () => {
  it('opens on every product at my store, without a search', async () => {
    const row = await open();
    expect(lists[0]!.get('branchId')).toBe('sensok');
    expect(lists[0]!.get('view')).toBe('all');
    expect(within(row).getByText('Low')).toBeTruthy();
    expect(within(row).getByText('To count')).toBeTruthy();
  });

  it('searches as you type and filters to what needs attention', async () => {
    await open();
    fireEvent.change(screen.getByLabelText('Scan or search'), { target: { value: 'pred' } });
    await waitFor(() => expect(lists.at(-1)!.get('q')).toBe('pred'));
    fireEvent.click(screen.getByRole('button', { name: /Running low/ }));
    await waitFor(() => expect(lists.at(-1)!.get('view')).toBe('low'));
    expect(lists.at(-1)!.get('q')).toBe('pred');
  });

  it('opens on a filter from a link', async () => {
    await open('/admin/stock?view=count');
    expect(lists[0]!.get('view')).toBe('count');
    expect(screen.getByRole('button', { name: /To count/ }).getAttribute('aria-pressed')).toBe('true');
  });

  it('records a counter sale', async () => {
    const row = await open();
    fireEvent.click(within(row).getByRole('button', { name: 'Sell EU 41' }));
    const sale = screen.getByRole('region', { name: 'Sale' });
    expect(within(sale).getByText('PRED-EU41')).toBeTruthy();
    // Only one EU 41 is free (two on the shelf, one held), so the sale cannot take a second.
    expect(within(row).getByRole('button', { name: 'Sell EU 41' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(within(sale).getByRole('button', { name: 'Record sale of 1 item' }));
    await waitFor(() => expect(posts).toEqual([{ path: 'sale', body: { branchId: 'sensok', lines: [{ variantId: V41, qty: 1 }] } }]));
    expect(await screen.findByText('Sale recorded')).toBeTruthy();
  });

  it('shows why a sale was refused', async () => {
    server.use(http.post(`${API}/v1/admin/stock/sale`, () => HttpResponse.json({ error: { code: 'insufficient_stock', message: 'Online order SC-2611-ZZZZZ holds the last unit.' } }, { status: 409 })));
    const row = await open();
    fireEvent.click(within(row).getByRole('button', { name: 'Sell EU 41' }));
    fireEvent.click(screen.getByRole('button', { name: 'Record sale of 1 item' }));
    expect(await screen.findByText('Online order SC-2611-ZZZZZ holds the last unit.')).toBeTruthy();
  });

  it('counts a size by the number on the shelf, with a reason', async () => {
    const row = await open();
    fireEvent.click(within(row).getByRole('button', { name: 'Count EU 41' }));
    const dialog = await screen.findByRole('dialog', { name: 'Count EU 41' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'One more' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'One more' }));
    expect(within(dialog).getByText('2 will be added')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delivery received' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save count' }));
    await waitFor(() => expect(posts).toEqual([{ path: 'count', body: { variantId: V41, branchId: 'sensok', count: 4, note: 'Delivery received' } }]));
  });

  it('will not count below what online orders hold', async () => {
    const row = await open();
    fireEvent.click(within(row).getByRole('button', { name: 'Count EU 41' }));
    const dialog = await screen.findByRole('dialog', { name: 'Count EU 41' });
    fireEvent.change(within(dialog).getByLabelText('On the shelf now'), { target: { value: '0' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save count' }));
    expect(await within(dialog).findByText(/held for online orders, so the count can't be below 1/)).toBeTruthy();
    expect(posts).toEqual([]);
  });

  it('transfers to another store', async () => {
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Transfer EU 40' }));
    const dialog = await screen.findByRole('dialog', { name: 'Transfer EU 40' });
    await within(dialog).findByRole('option', { name: 'Sonthormuk' });
    fireEvent.change(within(dialog).getByLabelText('To store'), { target: { value: 'sonthormuk' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Transfer' }));
    await waitFor(() => expect(posts).toEqual([{ path: 'transfer', body: { variantId: '60981c81-5e86-4baf-84e2-cddd1b9083db', from: 'sensok', to: 'sonthormuk', qty: 1 } }]));
  });

  it('shows the movement history of a size', async () => {
    const row = await open();
    fireEvent.click(within(row).getByRole('button', { name: 'History EU 41' }));
    const dialog = await screen.findByRole('dialog', { name: 'History of PRED-EU41' });
    expect(await within(dialog).findByText('Counter sale')).toBeTruthy();
  });
});
