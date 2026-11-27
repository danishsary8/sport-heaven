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
const LIST = { brandName: 'Adidas', categorySlug: 'boots', imageUrl: '/assets/catalog/pred.jpg', hoverImageUrl: null, imageCount: 1, priceMinCents: 25500, priceMaxCents: 25500, variantCount: 1, onHand: 7 };
const ROW = { id: PID, slug: 'predator', brandId: 'b1', categoryId: 'c1', nameI18n: { en: 'Predator Elite FG' }, status: 'active', isCustomizable: false, updatedAt: '2026-11-26T08:00:00Z' };
const PID2 = 'a1b2c3d4-0000-4000-8000-000000000002';
const ROW2 = { ...ROW, id: PID2, slug: 'copa', nameI18n: { en: 'Copa Pure FG' }, status: 'draft', ...LIST, imageUrl: '/assets/catalog/copa.jpg', hoverImageUrl: '/assets/catalog/copa-2.jpg', imageCount: 2, priceMinCents: 18000, priceMaxCents: 21000, variantCount: 8, onHand: 0 };
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
  images: [{ id: 'img1', colorId: 'col1', path: 'catalog/pred.jpg', url: '/assets/catalog/pred.jpg', alt: 'Predator', sort: 0 }],
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
    http.get(`${API}/v1/admin/products`, () => HttpResponse.json({ products: [{ ...ROW, ...LIST }, ROW2], total: 2, page: 1, pageSize: 50 })),
    http.get(`${API}/v1/admin/products/export.csv`, () => new HttpResponse('sku,price_usd\nPRED-EU39,255.00', { headers: { 'content-type': 'text/csv' } })),
    http.get(`${API}/v1/admin/products/:id`, () => HttpResponse.json({ product: PRODUCT })),
    http.get(`${API}/v1/admin/brands`, () => HttpResponse.json({ brands: [{ id: 'b1', slug: 'adidas', name: 'Adidas' }] })),
    http.get(`${API}/v1/admin/categories`, () => HttpResponse.json({ categories: [{ id: 'c1', slug: 'boots', nameI18n: { en: 'Boots' } }] })),
    http.patch(`${API}/v1/admin/products/:id`, async ({ request }) => (await rec(request), HttpResponse.json({ product: PRODUCT }))),
    http.put(`${API}/v1/admin/products/:id/variants/:vid`, async ({ request }) => (await rec(request), HttpResponse.json({ variant: PRODUCT.variants[0] }))),
    http.post(`${API}/v1/admin/products`, async ({ request }) => (await rec(request), HttpResponse.json({ product: { ...PRODUCT, id: 'new-id' } }, { status: 201 }))),
    http.post(`${API}/v1/admin/media`, async ({ request }) => {
      calls.push({ method: 'POST', url: '/v1/admin/media', body: request.headers.get('content-type') });
      return HttpResponse.json({ path: 'media/0b7e2f4c-1111-4222-8333-444455556666.png', url: 'http://api.test/v1/media/0b7e2f4c-1111-4222-8333-444455556666.png' }, { status: 201 });
    }),
    http.put(`${API}/v1/admin/products/:id/images`, async ({ request }) => (await rec(request), HttpResponse.json({ product: PRODUCT }))),
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
    expect(await screen.findByRole('link', { name: /Predator Elite FG/ }, { timeout: 4000 })).toHaveAttribute('href', `/admin/products/${PID}`);
  });

  it('shows each product with its price range, stock and a warning when it lacks a second photo', async () => {
    renderRoutes(routes, '/admin/products', { signedIn: true });
    const pred = await screen.findByRole('row', { name: /Predator Elite FG/ });
    expect(pred).toHaveTextContent('$255.00');
    expect(pred).toHaveTextContent('7 in stock');
    expect(within(pred).getByText('Needs a 2nd photo')).toBeTruthy();
    const copa = screen.getByRole('row', { name: /Copa Pure FG/ });
    expect(copa).toHaveTextContent('$180.00 – $210.00');
    expect(copa).toHaveTextContent('Out of stock');
    expect(within(copa).queryByText('Needs a 2nd photo')).toBeNull();
  });

  it('changes the status of the selected products in one go', async () => {
    renderRoutes(routes, '/admin/products', { signedIn: true });
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Select Predator Elite FG' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Copa Pure FG' }));
    const bar = screen.getByRole('region', { name: '2 selected' });
    fireEvent.click(within(bar).getByRole('button', { name: 'Make draft' }));
    await waitFor(() => expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(2));
    expect(calls).toContainEqual({ method: 'PATCH', url: `/v1/admin/products/${PID}`, body: { status: 'draft' } });
    expect(calls).toContainEqual({ method: 'PATCH', url: `/v1/admin/products/${PID2}`, body: { status: 'draft' } });
    expect(await screen.findByText('2 products set to draft')).toBeTruthy();
  });

  it('changes one product status right from the list', async () => {
    renderRoutes(routes, '/admin/products', { signedIn: true });
    fireEvent.change(await screen.findByRole('combobox', { name: 'Status of Copa Pure FG' }), { target: { value: 'active' } });
    await waitFor(() => expect(calls).toEqual([{ method: 'PATCH', url: `/v1/admin/products/${PID2}`, body: { status: 'active' } }]));
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

  it('shows the main and hover photo slots, and a shop preview', async () => {
    renderRoutes(routes, `/admin/products/${PID}`, { signedIn: true });
    const photos = await screen.findByRole('region', { name: 'Photos' });
    expect(within(photos).getByRole('group', { name: 'Main photo' })).toBeTruthy();
    expect(within(photos).getByRole('group', { name: 'Hover photo (second pose)' })).toHaveTextContent('Add the second pose');
    expect(screen.getByRole('region', { name: 'Shop preview' })).toHaveTextContent('Predator Elite FG');
  });

  it('uploads a second pose and saves the photos in order', async () => {
    renderRoutes(routes, `/admin/products/${PID}`, { signedIn: true });
    const photos = await screen.findByRole('region', { name: 'Photos' });
    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'side.png', { type: 'image/png' });
    fireEvent.change(within(photos).getByLabelText('Add photos'), { target: { files: [file] } });
    await waitFor(() => expect(calls).toContainEqual({ method: 'POST', url: '/v1/admin/media', body: 'image/png' }));
    expect(await within(photos).findByRole('group', { name: 'Hover photo (second pose)' })).not.toHaveTextContent('Add the second pose');
    fireEvent.click(within(photos).getByRole('button', { name: 'Save photos' }));
    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'PUT',
        url: `/v1/admin/products/${PID}/images`,
        body: { images: [{ path: 'catalog/pred.jpg', color: 'Red', alt: 'Predator' }, { path: 'media/0b7e2f4c-1111-4222-8333-444455556666.png' }] },
      }),
    );
  });

  it('makes another photo the main one', async () => {
    renderRoutes(routes, `/admin/products/${PID}`, { signedIn: true });
    const photos = await screen.findByRole('region', { name: 'Photos' });
    fireEvent.change(within(photos).getByLabelText('Add photos'), { target: { files: [new File(['x'], 'b.png', { type: 'image/png' })] } });
    const hover = await within(photos).findByRole('group', { name: 'Hover photo (second pose)' });
    await waitFor(() => expect(hover).not.toHaveTextContent('Add the second pose'));
    fireEvent.click(within(hover).getByRole('button', { name: 'Swap with main photo' }));
    fireEvent.click(within(photos).getByRole('button', { name: 'Save photos' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'PUT' && c.url.endsWith('/images'))?.body).toEqual({ images: [{ path: 'media/0b7e2f4c-1111-4222-8333-444455556666.png' }, { path: 'catalog/pred.jpg', color: 'Red', alt: 'Predator' }] }));
  });

  it('refuses files that are not photos before uploading', async () => {
    renderRoutes(routes, `/admin/products/${PID}`, { signedIn: true });
    const photos = await screen.findByRole('region', { name: 'Photos' });
    fireEvent.change(within(photos).getByLabelText('Add photos'), { target: { files: [new File(['x'], 'notes.txt', { type: 'text/plain' })] } });
    expect(await screen.findByText('notes.txt is not a JPG, PNG or WebP photo.')).toBeTruthy();
    expect(calls.some((c) => c.url === '/v1/admin/media')).toBe(false);
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
    fireEvent.change(await screen.findByLabelText('Update prices from a CSV file'), { target: { files: [file] } });
    const preview = await screen.findByRole('region', { name: 'Import preview' });
    expect(within(preview).getByText('PRED-EU39')).toBeTruthy();
    expect(calls[0]).toMatchObject({ method: 'POST', url: '/v1/admin/products/import?apply=false', body: 'sku,price_usd\nPRED-EU39,240.00' });
    fireEvent.click(within(preview).getByRole('button', { name: 'Apply 1 change' }));
    await waitFor(() => expect(calls[1]).toMatchObject({ url: '/v1/admin/products/import?apply=true' }));
    expect(await screen.findByText('Prices updated')).toBeTruthy();
  });

  it('checks a new-product spreadsheet and creates nothing while a row is wrong', async () => {
    renderRoutes(routes, '/admin/products', { signedIn: true });
    const csv = 'name,brand,category,colour,sizes,price\nCopa,Fake,boots,White,EU 40,120';
    fireEvent.change(await screen.findByLabelText('New products spreadsheet'), { target: { files: [new File([csv], 'new.csv', { type: 'text/csv' })] } });
    const check = await screen.findByRole('region', { name: 'New products check' });
    expect(await within(check).findByText('Line 2: unknown brand "Fake"')).toBeTruthy();
    expect(within(check).getByRole('button', { name: /Create/ })).toBeDisabled();
  });

  it('creates every product in a good spreadsheet as a draft', async () => {
    renderRoutes(routes, '/admin/products', { signedIn: true });
    const csv = 'name,brand,category,colour,sizes,price\nCopa Pure,adidas,boots,White,EU 40|EU 41,120\nCopa Lite,Adidas,Boots,Black,EU 42,90';
    fireEvent.change(await screen.findByLabelText('New products spreadsheet'), { target: { files: [new File([csv], 'new.csv', { type: 'text/csv' })] } });
    const check = await screen.findByRole('region', { name: 'New products check' });
    fireEvent.click(await within(check).findByRole('button', { name: 'Create 2 products as drafts' }));
    await waitFor(() => expect(calls.filter((c) => c.method === 'POST' && c.url === '/v1/admin/products')).toHaveLength(2));
    expect(calls[0]!.body).toMatchObject({ slug: 'copa-pure', brandSlug: 'adidas', status: 'draft', variants: [{ size: 'EU 40', priceCents: 12000 }, { size: 'EU 41', priceCents: 12000 }] });
    expect(await within(check).findByText('2 created')).toBeTruthy();
  });

  it('creates nothing when a product in the file already exists in the shop', async () => {
    server.use(
      http.get(`${API}/v1/admin/products`, ({ request }) => {
        const q = new URL(request.url).searchParams.get('q');
        return HttpResponse.json({ products: q === 'copa-lite' ? [{ ...ROW, ...LIST, slug: 'copa-lite' }] : [], total: 0, page: 1, pageSize: 50 });
      }),
    );
    renderRoutes(routes, '/admin/products', { signedIn: true });
    const csv = 'name,brand,category,colour,sizes,price\nCopa Pure,adidas,boots,White,EU 40,120\nCopa Lite,Adidas,Boots,Black,EU 42,90';
    fireEvent.change(await screen.findByLabelText('New products spreadsheet'), { target: { files: [new File([csv], 'new.csv', { type: 'text/csv' })] } });
    const check = await screen.findByRole('region', { name: 'New products check' });
    fireEvent.click(await within(check).findByRole('button', { name: 'Create 2 products as drafts' }));
    expect(await within(check).findByText('Line 3: copa-lite is already in the shop. Change the name or edit that product.')).toBeTruthy();
    expect(calls.filter((c) => c.method === 'POST')).toEqual([]);
  });

  it('clears the selection when the list changes, so hidden products are never changed', async () => {
    renderRoutes(routes, '/admin/products', { signedIn: true });
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Select Predator Elite FG' }));
    expect(screen.getByRole('region', { name: '1 selected' })).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'Draft' }));
    await waitFor(() => expect(screen.queryByRole('region', { name: /selected/ })).toBeNull());
  });

  it('keeps unsaved details when photos are saved', async () => {
    let version = 0;
    server.use(
      http.get(`${API}/v1/admin/products/:id`, () => HttpResponse.json({ product: { ...PRODUCT, updatedAt: `2026-11-26T08:00:0${version}Z` } })),
      http.put(`${API}/v1/admin/products/:id/images`, async ({ request }) => {
        await rec(request);
        version += 1;
        return HttpResponse.json({ product: PRODUCT });
      }),
    );
    renderRoutes(routes, `/admin/products/${PID}`, { signedIn: true });
    const name = await screen.findByLabelText('Name (English)');
    fireEvent.change(name, { target: { value: 'Predator, not saved yet' } });
    const photos = screen.getByRole('region', { name: 'Photos' });
    fireEvent.change(within(photos).getByLabelText('Add photos'), { target: { files: [new File(['x'], 'b.png', { type: 'image/png' })] } });
    await waitFor(() => expect(within(photos).getByRole('button', { name: 'Save photos' })).toBeEnabled());
    fireEvent.click(within(photos).getByRole('button', { name: 'Save photos' }));
    await waitFor(() => expect(version).toBe(1));
    await waitFor(() => expect(screen.getByText('Photos saved')).toBeTruthy());
    expect(screen.getByLabelText('Name (English)')).toHaveValue('Predator, not saved yet');
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
