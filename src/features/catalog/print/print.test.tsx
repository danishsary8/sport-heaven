import { fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from '../../../app/routes';
import { configureApi } from '../../../lib/api';
import { BRANCHES, MENU, product } from '../../../test/fixtures';
import { API, server, setupMsw } from '../../../test/msw';
import { renderRoutes } from '../../../test/render';

setupMsw();

const OPTIONS = {
  baseCents: 800,
  patches: [
    { id: 'none', label: 'No patch', feeCents: 0 },
    { id: 'ucl', label: 'Champions League', feeCents: 500 },
  ],
  fonts: [
    { id: 'pro-condensed', label: 'Pro condensed' },
    { id: 'classic-block', label: 'Classic block' },
  ],
  nameMaxLength: 14,
  numberMin: 1,
  numberMax: 99,
};

const JERSEY = {
  product: {
    ...product(1, { slug: 'home-kit', name: 'Home kit', category: 'jerseys' }),
    shortName: 'Home kit',
    description: null,
    highlights: [],
    specs: {},
    attributes: {},
    isCustomizable: true,
    heroTagline: null,
    images: [],
    variants: [{ id: '11111111-1111-4111-8111-111111111111', size: 'M', color: 'Black', sku: 'K-M', priceCents: 9500, compareAtCents: null, availability: 'ok', lowStockCount: null, byBranch: {} }],
    related: [],
    sizeGuide: null,
  },
};

let added: Record<string, unknown>[] = [];

beforeEach(() => {
  added = [];
  configureApi({ baseUrl: API });
  server.use(
    http.get(`${API}/v1/catalog/menu`, () => HttpResponse.json(MENU)),
    http.get(`${API}/v1/branches`, () => HttpResponse.json(BRANCHES)),
    http.get(`${API}/v1/cart`, () => HttpResponse.json({ cart: { lines: [] } })),
    http.get(`${API}/v1/catalog/print-options`, () => HttpResponse.json(OPTIONS)),
    http.get(`${API}/v1/catalog/products/home-kit`, () => HttpResponse.json(JERSEY)),
    http.get(`${API}/v1/catalog/products/home-kit/questions`, () => HttpResponse.json({ questions: [] })),
    http.post(`${API}/v1/cart/items`, async ({ request }) => {
      added.push((await request.json()) as Record<string, unknown>);
      return HttpResponse.json({ cart: { lines: [{ id: 'l1', qty: 1 }] } });
    }),
    http.get(`${API}/v1/catalog/products`, ({ request }) => {
      const cat = new URL(request.url).searchParams.get('category');
      return HttpResponse.json({ products: [product(cat === 'f1' ? 7 : 3, { name: `${cat} shirt` })], total: 1, page: 1, pageSize: 8 });
    }),
  );
});

async function openStudio() {
  renderRoutes(routes, '/p/home-kit');
  fireEvent.click(await screen.findByRole('radio', { name: 'M' }));
  fireEvent.click(await screen.findByRole('checkbox', { name: /Print a name and number/ }));
  return screen.getByRole('region', { name: 'Name and number' });
}

describe('print studio', () => {
  it('scrolls to the studio when the link ends in #print (the /custom and old studio links)', async () => {
    const scrolled: Element[] = [];
    // jsdom has no scrollIntoView.
    Element.prototype.scrollIntoView = function (this: Element) {
      scrolled.push(this);
    };
    renderRoutes(routes, '/p/home-kit#print');
    await screen.findByRole('radio', { name: 'M' });
    await vi.waitFor(() => expect(scrolled.some((el) => el.id === 'print')).toBe(true));
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
  });

  it('adds the shirt with the name, number, patch and font', async () => {
    const studio = await openStudio();
    expect(within(studio).getByText(/Printing costs \$8\.00/)).toBeTruthy();
    fireEvent.change(within(studio).getByLabelText('Name on the back'), { target: { value: 'sokha' } });
    fireEvent.change(within(studio).getByLabelText('Number'), { target: { value: '10' } });
    fireEvent.change(within(studio).getByLabelText('Patch'), { target: { value: 'ucl' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Add to bag' })[0]!);
    await screen.findByText('Added to bag');
    expect(added[0]).toEqual({ variantId: '11111111-1111-4111-8111-111111111111', qty: 1, customPrint: { name: 'SOKHA', number: 10, patch: 'ucl', font: 'pro-condensed' } });
  });

  it('explains what is wrong and keeps Add to bag off until the print is valid', async () => {
    const studio = await openStudio();
    fireEvent.change(within(studio).getByLabelText('Name on the back'), { target: { value: 'A' } });
    fireEvent.change(within(studio).getByLabelText('Number'), { target: { value: '100' } });
    expect(within(studio).getByText('Choose a number from 1 to 99.')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Add to bag' })[0]).toBeDisabled();
    fireEvent.change(within(studio).getByLabelText('Number'), { target: { value: '7' } });
    expect(screen.getAllByRole('button', { name: 'Add to bag' })[0]).toBeEnabled();
  });

  it('lists the printable jerseys and F1 shirts on /custom', async () => {
    renderRoutes(routes, '/custom');
    expect(await screen.findByRole('heading', { level: 1, name: 'Print your name and number' })).toBeTruthy();
    // Each card opens the product at its print studio.
    expect((await screen.findByRole('link', { name: /jerseys shirt/ })).getAttribute('href')).toMatch(/^\/p\/[^#]+#print$/);
    expect(await screen.findByRole('link', { name: /f1 shirt/ })).toBeTruthy();
  });
});
