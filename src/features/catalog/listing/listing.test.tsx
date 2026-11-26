import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../../../app/routes';
import { configureApi } from '../../../lib/api';
import { BRANCHES, FILTERS, MENU, product } from '../../../test/fixtures';
import { API, server, setupMsw } from '../../../test/msw';
import { renderRoutes } from '../../../test/render';

setupMsw();

let productRequests: URLSearchParams[] = [];

beforeEach(() => {
  productRequests = [];
  configureApi({ baseUrl: API });
  server.use(
    http.get(`${API}/v1/catalog/menu`, () => HttpResponse.json(MENU)),
    http.get(`${API}/v1/branches`, () => HttpResponse.json(BRANCHES)),
    http.get(`${API}/v1/cart`, () => HttpResponse.json({ cart: { lines: [] } })),
    http.get(`${API}/v1/catalog/filters`, () => HttpResponse.json(FILTERS)),
    http.get(`${API}/v1/catalog/products`, ({ request }) => {
      const params = new URL(request.url).searchParams;
      productRequests.push(params);
      const page = Number(params.get('page') ?? 1);
      const size = Number(params.get('pageSize') ?? 24);
      const items = Array.from({ length: Math.min(size, 30 - (page - 1) * size) }, (_, i) => product((page - 1) * size + i + 1));
      return HttpResponse.json({ products: items, total: 30, page, pageSize: size });
    }),
  );
});

describe('product listing', () => {
  it('reads filters and sort from the URL and shows the products with the count', async () => {
    renderRoutes(routes, '/c/boots?brand=nike&brand=puma&sort=price_asc');
    expect(await screen.findByRole('heading', { level: 1, name: 'Boots' })).toBeTruthy();
    expect(await screen.findByRole('link', { name: /Product 1\b/ })).toHaveAttribute('href', '/p/product-1');
    expect(screen.getByText('30 items')).toBeTruthy();
    const params = productRequests[0]!;
    expect(params.get('category')).toBe('boots');
    expect(params.getAll('brand')).toEqual(['nike', 'puma']);
    expect(params.get('sort')).toBe('price_asc');
  });

  it('applies a ticked filter to the URL and the request', async () => {
    const { router } = renderRoutes(routes, '/c/boots');
    await screen.findByRole('link', { name: /Product 1\b/ });
    const filters = screen.getByRole('complementary', { name: 'Filters' });
    fireEvent.click(await within(filters).findByRole('checkbox', { name: /Puma/ }));
    await waitFor(() => expect(router.state.location.search).toContain('brand=puma'));
    await waitFor(() => expect(productRequests.some((p) => p.getAll('brand').includes('puma'))).toBe(true));
  });

  it('loads more products and keeps the page in the URL', async () => {
    const { router } = renderRoutes(routes, '/shop');
    await screen.findByRole('link', { name: /Product 24\b/ });
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(await screen.findByRole('link', { name: /Product 30\b/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Product 1\b/ })).toBeTruthy();
    await waitFor(() => expect(router.state.location.search).toContain('page=2'));
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
  });

  it('shows an empty state with a way to clear the filters', async () => {
    server.use(http.get(`${API}/v1/catalog/products`, () => HttpResponse.json({ products: [], total: 0, page: 1, pageSize: 24 })));
    const { router } = renderRoutes(routes, '/shop?size=EU%2050');
    const heading = await screen.findByRole('heading', { name: 'Nothing matches these filters' });
    fireEvent.click(within(heading.parentElement!).getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(router.state.location.search).toBe(''));
  });

  it('shows the error with a retry when the products cannot load', async () => {
    server.use(http.get(`${API}/v1/catalog/products`, () => HttpResponse.json({ error: { code: 'internal', message: 'The shop is busy. Try again.' } }, { status: 500 })));
    renderRoutes(routes, '/shop');
    expect(await screen.findByText('The shop is busy. Try again.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  it('lists a brand and a collection with their own titles', async () => {
    server.use(http.get(`${API}/v1/catalog/collections/new-arrivals`, () => HttpResponse.json({ collection: { slug: 'new-arrivals', name: 'New arrivals', description: 'Fresh drops' } })));
    renderRoutes(routes, '/collections/new-arrivals');
    expect(await screen.findByRole('heading', { level: 1, name: 'New arrivals' })).toBeTruthy();
    await waitFor(() => expect(productRequests[0]?.get('collection')).toBe('new-arrivals'));
  });
});
