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
    http.get(`${API}/v1/search`, ({ request }) => {
      const q = new URL(request.url).searchParams.get('q');
      if (q === 'zzz') return HttpResponse.json({ products: [], total: 0, page: 1, pageSize: 24 });
      return HttpResponse.json({ products: [product(1, { name: 'Messi boot' })], total: 1, page: 1, pageSize: 24 });
    }),
  );
});

describe('search', () => {
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
