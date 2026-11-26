import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../../app/routes';
import { configureApi } from '../../lib/api';
import { API, server, setupMsw } from '../../test/msw';
import { renderRoutes } from '../../test/render';

setupMsw();

const MENU = {
  categories: [
    { slug: 'boots', name: 'Boots', productCount: 20 },
    { slug: 'jerseys', name: 'Jerseys', productCount: 30 },
  ],
  brands: [{ slug: 'nike', name: 'Nike', productCount: 12 }],
  collections: [],
};
const BRANCHES = {
  branches: [
    { id: 'sensok', name: 'Sport Castle Sen Sok', shortName: 'Sen Sok', address: 'St 1986', district: 'Sen Sok', phone: '012 000 001', telegram: null, hours: '8:00–21:00', landmarks: null, lat: null, lng: null, pickupEnabled: true },
  ],
};
const cartWith = (qtys: number[]) => ({ cart: { lines: qtys.map((qty, i) => ({ id: String(i), qty })) } });

beforeEach(() => {
  configureApi({ baseUrl: API });
  server.use(
    http.get(`${API}/v1/catalog/menu`, () => HttpResponse.json(MENU)),
    http.get(`${API}/v1/branches`, () => HttpResponse.json(BRANCHES)),
    http.get(`${API}/v1/cart`, () => HttpResponse.json(cartWith([1, 2]))),
    http.get(`${API}/v1/catalog/home`, () => HttpResponse.json({ sections: [] })),
  );
});

describe('app shell', () => {
  it('shows the categories from the menu and the bag count', async () => {
    renderRoutes(routes, '/');
    const nav = await screen.findByRole('navigation', { name: 'Main' });
    expect(await within(nav).findByRole('link', { name: 'Boots' })).toHaveAttribute('href', '/c/boots');
    expect(await screen.findByRole('link', { name: 'Bag, 3 items' })).toBeTruthy();
    expect((await screen.findAllByText(/Sen Sok/)).length).toBeGreaterThan(0);
  });

  it('still renders the header when the bag cannot be loaded', async () => {
    server.use(http.get(`${API}/v1/cart`, () => HttpResponse.json({ error: { code: 'internal', message: 'x' } }, { status: 500 })));
    renderRoutes(routes, '/');
    expect(await screen.findByRole('link', { name: 'Bag' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Sport Castle home' })).toBeTruthy();
  });

  it('shows a 404 page with search for unknown links', async () => {
    renderRoutes(routes, '/nope/never');
    expect(await screen.findByRole('heading', { name: "This page doesn't exist" })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Search the shop' })).toHaveAttribute('href', '/search');
  });

  it('sends old hash links to the new product page', async () => {
    const { router } = renderRoutes(routes, '/#/products/abc-boot');
    await waitFor(() => expect(router.state.location.pathname).toBe('/p/abc-boot'));
  });

  it('opens the menu sheet with categories and the language switch', async () => {
    renderRoutes(routes, '/');
    (await screen.findByRole('button', { name: 'Menu' })).click();
    const dialog = await screen.findByRole('dialog', { name: 'Menu' });
    expect(await within(dialog).findByRole('link', { name: 'Jerseys' })).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'ខ្មែរ' })).toBeTruthy();
  });
});
