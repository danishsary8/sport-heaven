import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../../../app/routes';
import { configureApi } from '../../../lib/api';
import { BRANCHES, MENU, product } from '../../../test/fixtures';
import { API, server, setupMsw } from '../../../test/msw';
import { renderRoutes } from '../../../test/render';

setupMsw();

const variant = (id: string, size: string, color: string, availability: string, lowStockCount: number | null = null) => ({
  id,
  size,
  color,
  sku: `SKU-${id}`,
  priceCents: 27000,
  compareAtCents: null,
  availability,
  lowStockCount,
  byBranch: { sensok: availability, sonthormuk: availability === 'out' ? 'out' : 'ok' },
});

const DETAIL = {
  product: {
    ...product(1, { name: 'F50 Elite FG', slug: 'f50', brand: { slug: 'adidas', name: 'Adidas' }, priceCents: 27000 }),
    colors: [
      { name: 'Gold', swatchHex: '#D4AF37' },
      { name: 'Black', swatchHex: '#000000' },
    ],
    shortName: 'F50',
    description: 'Light and fast.',
    highlights: ['Grippy upper'],
    specs: { weightGrams: '179g' },
    attributes: {},
    isCustomizable: false,
    heroTagline: null,
    images: [
      { url: '/assets/catalog/gold.jpg', alt: 'Gold boot', colorName: 'Gold' },
      { url: '/assets/catalog/black.jpg', alt: 'Black boot', colorName: 'Black' },
    ],
    variants: [
      variant('11111111-1111-4111-8111-111111111111', 'EU 40', 'Gold', 'ok'),
      variant('22222222-2222-4222-8222-222222222222', 'EU 41', 'Gold', 'low', 2),
      variant('33333333-3333-4333-8333-333333333333', 'EU 42', 'Gold', 'out'),
      variant('44444444-4444-4444-8444-444444444444', 'EU 40', 'Black', 'ok'),
    ],
    related: [product(9, { name: 'Predator' })],
    sizeGuide: { title: 'Boot size guide', columns: ['EU', 'UK'], rows: [['40', '6']] },
  },
};

const CART_LINE = { id: 'l1', qty: 1 };
let added: unknown[] = [];
let asked: unknown[] = [];

beforeEach(() => {
  added = [];
  asked = [];
  configureApi({ baseUrl: API });
  server.use(
    http.get(`${API}/v1/catalog/menu`, () => HttpResponse.json(MENU)),
    http.get(`${API}/v1/branches`, () => HttpResponse.json(BRANCHES)),
    http.get(`${API}/v1/cart`, () => HttpResponse.json({ cart: { lines: [] } })),
    http.get(`${API}/v1/catalog/products/f50`, () => HttpResponse.json(DETAIL)),
    http.get(`${API}/v1/catalog/products/nope`, () => HttpResponse.json({ error: { code: 'not_found', message: 'Product not found' } }, { status: 404 })),
    http.get(`${API}/v1/catalog/products/f50/questions`, () =>
      HttpResponse.json({ questions: [{ id: 'q1', authorName: 'Dara', question: 'Do they run small?', answer: 'True to size.', answeredAt: '2026-11-20T00:00:00Z', createdAt: '2026-11-19T00:00:00Z' }] }),
    ),
    http.post(`${API}/v1/catalog/products/f50/questions`, async ({ request }) => {
      asked.push(await request.json());
      return HttpResponse.json({ status: 'pending' }, { status: 201 });
    }),
    http.post(`${API}/v1/cart/items`, async ({ request }) => {
      added.push(await request.json());
      return HttpResponse.json({ cart: { lines: [CART_LINE] } });
    }),
  );
});

describe('product page', () => {
  it('shows sizes as a radio group, crosses out sold-out sizes and waits for a size', async () => {
    renderRoutes(routes, '/p/f50');
    expect(await screen.findByRole('heading', { level: 1, name: 'F50 Elite FG' })).toBeTruthy();
    const sizes = screen.getByRole('radiogroup', { name: 'Size' });
    expect(within(sizes).getByRole('radio', { name: /EU 42/ })).toBeDisabled();
    const add = screen.getAllByRole('button', { name: 'Add to bag' })[0]!;
    expect(add).toBeDisabled();
    fireEvent.click(within(sizes).getByRole('radio', { name: /EU 41/ }));
    expect(screen.getAllByText('Only 2 left').length).toBeGreaterThan(0);
    expect(add).toBeEnabled();
  });

  it('adds the chosen size to the bag and updates the count', async () => {
    renderRoutes(routes, '/p/f50');
    const sizes = await screen.findByRole('radiogroup', { name: 'Size' });
    fireEvent.click(within(sizes).getByRole('radio', { name: /EU 40/ }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Add to bag' })[0]!);
    expect(await screen.findByText('Added to bag')).toBeTruthy();
    expect(added).toEqual([{ variantId: '11111111-1111-4111-8111-111111111111', qty: 1 }]);
    expect(await screen.findByRole('link', { name: 'Bag, 1 items' })).toBeTruthy();
  });

  it('shows which stores have the chosen size', async () => {
    renderRoutes(routes, '/p/f50');
    const sizes = await screen.findByRole('radiogroup', { name: 'Size' });
    fireEvent.click(within(sizes).getByRole('radio', { name: /EU 40/ }));
    const stores = screen.getByRole('region', { name: 'In our stores' });
    expect(await within(stores).findByText('Sen Sok')).toBeTruthy();
  });

  it('switches colour and keeps it in the URL', async () => {
    const { router } = renderRoutes(routes, '/p/f50');
    fireEvent.click(await screen.findByRole('radio', { name: 'Black' }));
    await waitFor(() => expect(router.state.location.search).toBe('?color=Black'));
    expect(screen.getByRole('img', { name: 'Black boot' })).toBeTruthy();
  });

  it('lists answered questions and sends a new one for review', async () => {
    renderRoutes(routes, '/p/f50');
    expect(await screen.findByText('Do they run small?')).toBeTruthy();
    expect(screen.getByText('True to size.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Sokha' } });
    fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'Is there a wide fit?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
    expect(await screen.findByText(/We'll answer here/)).toBeTruthy();
    expect(asked).toEqual([{ authorName: 'Sokha', question: 'Is there a wide fit?' }]);
  });

  it('says when a product does not exist', async () => {
    renderRoutes(routes, '/p/nope');
    expect(await screen.findByRole('heading', { name: "This product isn't available" })).toBeTruthy();
  });
});
