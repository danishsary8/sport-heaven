import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../../../app/routes';
import { configureApi } from '../../../lib/api';
import { BRANCHES, FILTERS, MENU, product } from '../../../test/fixtures';
import { API, server, setupMsw } from '../../../test/msw';
import { renderRoutes } from '../../../test/render';

setupMsw();

let suggestCalls: string[] = [];

beforeEach(() => {
  suggestCalls = [];
  configureApi({ baseUrl: API });
  server.use(
    http.get(`${API}/v1/catalog/menu`, () => HttpResponse.json(MENU)),
    http.get(`${API}/v1/branches`, () => HttpResponse.json(BRANCHES)),
    http.get(`${API}/v1/cart`, () => HttpResponse.json({ cart: { lines: [] } })),
    http.get(`${API}/v1/catalog/home`, () => HttpResponse.json({ sections: [] })),
    http.get(`${API}/v1/catalog/filters`, () => HttpResponse.json(FILTERS)),
    http.get(`${API}/v1/catalog/products`, () => HttpResponse.json({ products: [product(2, { name: 'Popular kit' })], total: 1, page: 1, pageSize: 4 })),
    http.get(`${API}/v1/search/suggest`, ({ request }) => {
      const q = new URL(request.url).searchParams.get('q') ?? '';
      suggestCalls.push(q);
      return HttpResponse.json({ products: [{ slug: 'messi-boot', name: 'Messi boot', imageUrl: null, priceCents: 27000 }], brands: [], categories: [] });
    }),
    // Smart search is off unless a test turns it on.
    http.get(`${API}/v1/search/smart`, () => HttpResponse.json({ available: false, filters: null })),
    http.get(`${API}/v1/search`, ({ request }) => {
      const q = new URL(request.url).searchParams.get('q');
      if (q === 'zzz') return HttpResponse.json({ products: [], total: 0, page: 1, pageSize: 24 });
      return HttpResponse.json({ products: [product(1, { name: 'Messi boot' })], total: 1, page: 1, pageSize: 24 });
    }),
  );
});

describe('search', () => {
  it('opens the matching shop page when smart search reads the words as filters, and offers the exact words instead', async () => {
    const asked: string[] = [];
    server.use(
      http.get(`${API}/v1/search/smart`, ({ request }) => {
        asked.push(new URL(request.url).searchParams.get('q') ?? '');
        return HttpResponse.json({ available: true, filters: { category: 'jerseys', continent: ['south-america'], priceMaxCents: 10000, q: 'messi' } });
      }),
    );
    const { router } = renderRoutes(routes, '/search?q=argentina%20messi%20shirt%20under%20100');
    await waitFor(() => expect(router.state.location.pathname).toBe('/c/jerseys'));
    const sp = router.state.location.search;
    expect(Object.fromEntries(new URLSearchParams(sp))).toEqual({ continent: 'south-america', priceMax: '10000', q: 'messi', smart: 'argentina messi shirt under 100' });
    expect(asked).toEqual(['argentina messi shirt under 100']);
    expect(await screen.findByText(/Smart search read “argentina messi shirt under 100”/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Search the exact words instead' })).toHaveAttribute('href', '/search?q=argentina%20messi%20shirt%20under%20100&exact=1');
  });

  it('shows plain results for the exact words, without asking smart search', async () => {
    const asked: string[] = [];
    server.use(http.get(`${API}/v1/search/smart`, () => (asked.push('x'), HttpResponse.json({ available: true, filters: { category: 'boots' } }))));
    renderRoutes(routes, '/search?q=messi%20boot&exact=1');
    expect(await screen.findByText('Messi boot')).toBeTruthy();
    expect(asked).toEqual([]);
  });

  it('falls back to plain results when smart search is off or reads only keywords', async () => {
    server.use(http.get(`${API}/v1/search/smart`, () => HttpResponse.json({ available: true, filters: { q: 'messi boot' } })));
    const { router } = renderRoutes(routes, '/search?q=messi%20boot');
    expect(await screen.findByText('Messi boot')).toBeTruthy();
    expect(router.state.location.pathname).toBe('/search');
  });

  it('suggests products after 2 characters with a debounce, and shows popular links before', async () => {
    renderRoutes(routes, '/');
    fireEvent.click(await screen.findByRole('button', { name: 'Search' }));
    const dialog = await screen.findByRole('dialog', { name: 'Search' });
    expect(await within(dialog).findByRole('link', { name: 'Boots' })).toHaveAttribute('href', '/c/boots');
    const box = within(dialog).getByRole('searchbox');
    fireEvent.change(box, { target: { value: 'm' } });
    await act(() => new Promise((r) => setTimeout(r, 350)));
    expect(suggestCalls).toEqual([]);
    fireEvent.change(box, { target: { value: 'me' } });
    fireEvent.change(box, { target: { value: 'mes' } });
    expect(await within(dialog).findByRole('link', { name: /Messi boot/ })).toHaveAttribute('href', '/p/messi-boot');
    expect(suggestCalls).toEqual(['mes']);
  });

  it('submits to the results page', async () => {
    const { router } = renderRoutes(routes, '/');
    fireEvent.click(await screen.findByRole('button', { name: 'Search' }));
    const box = within(await screen.findByRole('dialog', { name: 'Search' })).getByRole('searchbox');
    fireEvent.change(box, { target: { value: 'messi' } });
    fireEvent.submit(box.closest('form')!);
    await waitFor(() => expect(router.state.location.pathname + router.state.location.search).toBe('/search?q=messi'));
    expect(await screen.findByRole('heading', { level: 1, name: 'Results for “messi”' })).toBeTruthy();
    expect(await screen.findByRole('link', { name: /Messi boot/ })).toBeTruthy();
  });

  it('says when quick suggestions fail and keeps Search working', async () => {
    server.use(http.get(`${API}/v1/search/suggest`, () => HttpResponse.json({ error: { code: 'internal', message: 'x' } }, { status: 500 })));
    renderRoutes(routes, '/');
    fireEvent.click(await screen.findByRole('button', { name: 'Search' }));
    const dialog = await screen.findByRole('dialog', { name: 'Search' });
    fireEvent.change(within(dialog).getByRole('searchbox'), { target: { value: 'messi' } });
    expect(await within(dialog).findByText('Quick results are not available. Press Search to see all results.')).toBeTruthy();
  });

  it('says when nothing was found and suggests where to look', async () => {
    renderRoutes(routes, '/search?q=zzz');
    expect(await screen.findByRole('heading', { name: 'No results for “zzz”' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Shop all' })).toHaveAttribute('href', '/shop');
  });
});
