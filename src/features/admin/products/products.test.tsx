import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from '../../../app/routes';
import { configureApi } from '../../../lib/api';
import { adminBase } from '../../../test/admin';
import { API, server, setupMsw } from '../../../test/msw';
import { renderRoutes } from '../../../test/render';

setupMsw();

const PID = 'f408daf5-756f-4457-8ebf-dd5e5e6eec7c';
const VID = '60981c81-5e86-4baf-84e2-cddd1b9083db';
const ROW = { id: PID, slug: 'predator', brandId: 'b1', categoryId: 'c1', nameI18n: { en: 'Predator Elite FG' }, status: 'active', isCustomizable: false, updatedAt: '2026-11-26T08:00:00Z' };
const PRODUCT = {
  ...ROW,
  shortNameI18n: null,
  descriptionI18n: { en: 'Grip.' },
  highlights: ['Fold-over tongue'],
  specs: {},
  attributes: {},
  flags: {},
  heroTagline: null,
  colors: [{ id: 'col1', name: 'Red', swatchHex: '#D81E2B', sort: 0 }],
  variants: [{ id: VID, colorId: 'col1', sizeLabel: 'EU 39', sizeSort: 390, sku: 'PRED-EU39', priceCents: 25500, compareAtCents: 28000, status: 'active' }],
  images: [{ id: 'img1', colorId: 'col1', path: 'catalog/pred.jpg', alt: 'Predator', sort: 0 }],
};

let calls: { method: string; url: string; body: unknown }[] = [];
const rec = async (request: Request) => {
  const text = await request.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* csv */
  }
  calls.push({ method: request.method, url: request.url.replace(API, ''), body });
};

beforeEach(() => {
  calls = [];
  configureApi({ baseUrl: API });
  server.use(
    ...adminBase('admin'),
    http.get(`${API}/v1/admin/products`, () => HttpResponse.json({ products: [ROW], total: 1, page: 1, pageSize: 20 })),
    http.get(`${API}/v1/admin/products/export.csv`, () => new HttpResponse('sku,price_usd\nPRED-EU39,255.00', { headers: { 'content-type': 'text/csv' } })),
    http.get(`${API}/v1/admin/products/:id`, () => HttpResponse.json({ product: PRODUCT })),
    http.get(`${API}/v1/admin/brands`, () => HttpResponse.json({ brands: [{ id: 'b1', slug: 'adidas', name: 'Adidas' }] })),
    http.get(`${API}/v1/admin/categories`, () => HttpResponse.json({ categories: [{ id: 'c1', slug: 'boots', nameI18n: { en: 'Boots' } }] })),
    http.patch(`${API}/v1/admin/products/:id`, async ({ request }) => (await rec(request), HttpResponse.json({ product: PRODUCT }))),
    http.put(`${API}/v1/admin/products/:id/variants/:vid`, async ({ request }) => (await rec(request), HttpResponse.json({ variant: PRODUCT.variants[0] }))),
    http.post(`${API}/v1/admin/products`, async ({ request }) => (await rec(request), HttpResponse.json({ product: { ...PRODUCT, id: 'new-id' } }, { status: 201 }))),
    http.post(`${API}/v1/admin/products/import`, async ({ request }) => {
      await rec(request);
      const apply = new URL(request.url).searchParams.get('apply') === 'true';
      return HttpResponse.json({ applied: apply, changes: [{ sku: 'PRED-EU39', field: 'price_usd', from: '255.00', to: '240.00' }], errors: [] });
    }),
  );
});

describe('admin products', () => {
  it('lists products with links to edit them', async () => {
    renderRoutes(routes, '/admin/products', { signedIn: true });
    expect(await screen.findByRole('link', { name: /Predator Elite FG/ })).toHaveAttribute('href', `/admin/products/${PID}`);
  });

  it('saves product fields and a size price', async () => {
    renderRoutes(routes, `/admin/products/${PID}`, { signedIn: true });
    const name = await screen.findByLabelText('Name (English)');
    fireEvent.change(name, { target: { value: 'Predator 25 Elite FG' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save product' }));
    await waitFor(() => expect(calls).toContainEqual({ method: 'PATCH', url: `/v1/admin/products/${PID}`, body: { name: { en: 'Predator 25 Elite FG' } } }));
    const row = screen.getByRole('listitem', { name: /PRED-EU39/ });
    fireEvent.change(within(row).getByLabelText('Price EU 39'), { target: { value: '240.00' } });
    fireEvent.click(within(row).getByRole('button', { name: 'Save EU 39' }));
    await waitFor(() => expect(calls).toContainEqual({ method: 'PUT', url: `/v1/admin/products/${PID}/variants/${VID}`, body: { priceCents: 24000 } }));
  });

  it('creates a product with its sizes', async () => {
    const { router } = renderRoutes(routes, '/admin/products/new', { signedIn: true });
    await screen.findByRole('option', { name: 'Adidas' });
    fireEvent.change(screen.getByLabelText('Name (English)'), { target: { value: 'Copa Pure' } });
    fireEvent.change(screen.getByLabelText('Web address'), { target: { value: 'copa-pure' } });
    fireEvent.change(screen.getByLabelText('Brand'), { target: { value: 'adidas' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'boots' } });
    fireEvent.change(screen.getByLabelText('Colour'), { target: { value: 'White' } });
    fireEvent.change(screen.getByLabelText('Sizes (comma separated)'), { target: { value: 'EU 40, EU 41' } });
    fireEvent.change(screen.getByLabelText('Price (USD)'), { target: { value: '120' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create product' }));
    await waitFor(() =>
      expect(calls[0]).toEqual({
        method: 'POST',
        url: '/v1/admin/products',
        body: {
          slug: 'copa-pure',
          brandSlug: 'adidas',
          categorySlug: 'boots',
          name: { en: 'Copa Pure' },
          status: 'draft',
          colors: [{ name: 'White' }],
          variants: [
            { color: 'White', size: 'EU 40', priceCents: 12000 },
            { color: 'White', size: 'EU 41', priceCents: 12000 },
          ],
        },
      }),
    );
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/products/new-id'));
  });

  it('previews a price import before applying it', async () => {
    renderRoutes(routes, '/admin/products', { signedIn: true });
    const file = new File(['sku,price_usd\nPRED-EU39,240.00'], 'prices.csv', { type: 'text/csv' });
    fireEvent.change(await screen.findByLabelText('Import prices from a CSV file'), { target: { files: [file] } });
    const preview = await screen.findByRole('region', { name: 'Import preview' });
    expect(within(preview).getByText('PRED-EU39')).toBeTruthy();
    expect(calls[0]).toMatchObject({ method: 'POST', url: '/v1/admin/products/import?apply=false', body: 'sku,price_usd\nPRED-EU39,240.00' });
    fireEvent.click(within(preview).getByRole('button', { name: 'Apply 1 change' }));
    await waitFor(() => expect(calls[1]).toMatchObject({ url: '/v1/admin/products/import?apply=true' }));
    expect(await screen.findByText('Prices updated')).toBeTruthy();
  });

  it('downloads the price list', async () => {
    const create = vi.fn(() => 'blob:prices');
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    renderRoutes(routes, '/admin/products', { signedIn: true });
    fireEvent.click(await screen.findByRole('button', { name: 'Export prices (CSV)' }));
    await waitFor(() => expect(create).toHaveBeenCalled());
  });
});
