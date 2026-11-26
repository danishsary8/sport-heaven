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
const LOOKUP = {
  branchId: 'sensok',
  products: [
    {
      id: 'p1',
      slug: 'predator',
      name: 'Predator Elite FG',
      variants: [
        { id: '60981c81-5e86-4baf-84e2-cddd1b9083db', sku: 'PRED-EU40', size: 'EU 40', color: 'Red', branchId: 'sensok', onHand: 7, reserved: 0, available: 7 },
        { id: V41, sku: 'PRED-EU41', size: 'EU 41', color: 'Red', branchId: 'sensok', onHand: 2, reserved: 1, available: 1 },
      ],
    },
  ],
};

let lookups: URLSearchParams[] = [];
let posts: { path: string; body: unknown }[] = [];

beforeEach(() => {
  lookups = [];
  posts = [];
  configureApi({ baseUrl: API });
  server.use(
    ...adminBase('staff'),
    http.get(`${API}/v1/admin/stock/lookup`, ({ request }) => {
      lookups.push(new URL(request.url).searchParams);
      return HttpResponse.json(LOOKUP);
    }),
    http.get(`${API}/v1/admin/stock/movements`, () =>
      HttpResponse.json({ movements: [{ id: '1', branchId: 'sensok', deltaOnHand: -1, deltaReserved: 0, reason: 'counter_sale', refId: 'S-1', note: null, actorUserId: 'u1', createdAt: '2026-11-26T08:00:00Z' }] }),
    ),
    http.post(`${API}/v1/admin/stock/:action`, async ({ request, params }) => {
      const body = await request.json();
      posts.push({ path: String(params.action), body });
      return HttpResponse.json(params.action === 'sale' ? { saleId: 'S-2', lines: [] } : { stock: {} });
    }),
  );
});

async function search() {
  renderRoutes(routes, '/admin/stock', { signedIn: true });
  const box = await screen.findByLabelText('SKU or product name');
  fireEvent.change(box, { target: { value: 'pred' } });
  fireEvent.submit(box.closest('form')!);
  return screen.findByRole('listitem', { name: /EU 41/ });
}

describe('counter stock screen', () => {
  it('looks up stock at my store when Enter is pressed', async () => {
    const row = await search();
    expect(lookups[0]!.get('q')).toBe('pred');
    expect(lookups[0]!.get('branchId')).toBe('sensok');
    expect(within(row).getByText('2')).toBeTruthy();
  });

  it('records a counter sale', async () => {
    const row = await search();
    fireEvent.click(within(row).getByRole('button', { name: 'Sell EU 41' }));
    fireEvent.click(within(row).getByRole('button', { name: 'Sell EU 41' }));
    const sale = screen.getByRole('region', { name: 'Sale' });
    expect(within(sale).getByText('PRED-EU41')).toBeTruthy();
    fireEvent.click(within(sale).getByRole('button', { name: 'Record sale of 2 items' }));
    await waitFor(() => expect(posts).toEqual([{ path: 'sale', body: { branchId: 'sensok', lines: [{ variantId: V41, qty: 2 }] } }]));
    expect(await screen.findByText('Sale recorded')).toBeTruthy();
  });

  it('shows why a sale was refused', async () => {
    server.use(http.post(`${API}/v1/admin/stock/sale`, () => HttpResponse.json({ error: { code: 'insufficient_stock', message: 'Online order SC-2611-ZZZZZ holds the last unit.' } }, { status: 409 })));
    const row = await search();
    fireEvent.click(within(row).getByRole('button', { name: 'Sell EU 41' }));
    fireEvent.click(screen.getByRole('button', { name: 'Record sale of 1 item' }));
    expect(await screen.findByText('Online order SC-2611-ZZZZZ holds the last unit.')).toBeTruthy();
  });

  it('adjusts the count with a reason', async () => {
    const row = await search();
    fireEvent.click(within(row).getByRole('button', { name: 'Adjust EU 41' }));
    const dialog = await screen.findByRole('dialog', { name: 'Adjust EU 41' });
    fireEvent.change(within(dialog).getByLabelText('Change (use minus to remove)'), { target: { value: '-1' } });
    fireEvent.change(within(dialog).getByLabelText('Reason'), { target: { value: 'Damaged' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save adjustment' }));
    await waitFor(() => expect(posts).toEqual([{ path: 'adjust', body: { variantId: V41, branchId: 'sensok', delta: -1, note: 'Damaged' } }]));
  });

  it('transfers to another store', async () => {
    const row = await search();
    fireEvent.click(within(row).getByRole('button', { name: 'Transfer EU 41' }));
    const dialog = await screen.findByRole('dialog', { name: 'Transfer EU 41' });
    await within(dialog).findByRole('option', { name: 'Sonthormuk' });
    fireEvent.change(within(dialog).getByLabelText('To store'), { target: { value: 'sonthormuk' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Transfer' }));
    await waitFor(() => expect(posts).toEqual([{ path: 'transfer', body: { variantId: V41, from: 'sensok', to: 'sonthormuk', qty: 1 } }]));
  });

  it('shows the movement history of a size', async () => {
    const row = await search();
    fireEvent.click(within(row).getByRole('button', { name: 'History EU 41' }));
    const dialog = await screen.findByRole('dialog', { name: 'History of PRED-EU41' });
    expect(await within(dialog).findByText('Counter sale')).toBeTruthy();
  });
});
