import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../../../app/routes';
import { configureApi } from '../../../lib/api';
import { BRANCHES, MENU, product } from '../../../test/fixtures';
import { API, server, setupMsw } from '../../../test/msw';
import { renderRoutes } from '../../../test/render';

setupMsw();

const HOME = {
  sections: [
    { id: 'h', type: 'hero', payload: { title: 'Matchday gear for Phnom Penh', subtitle: 'Boots and kits', link: { collection: 'new-arrivals' }, imagePath: null } },
    { id: 'r', type: 'product_rail', payload: { title: 'New arrivals', query: { tag: ['new'], sort: 'new' }, products: [product(1), product(2)] } },
    { id: 'g', type: 'category_grid', payload: { title: 'Shop by category', categories: ['boots', 'jerseys'] } },
    { id: 'b', type: 'brand_row', payload: { title: 'Brands', brands: ['nike', 'puma'] } },
  ],
};

beforeEach(() => {
  configureApi({ baseUrl: API });
  server.use(
    http.get(`${API}/v1/catalog/menu`, () => HttpResponse.json(MENU)),
    http.get(`${API}/v1/branches`, () => HttpResponse.json(BRANCHES)),
    http.get(`${API}/v1/cart`, () => HttpResponse.json({ cart: { lines: [] } })),
    http.get(`${API}/v1/catalog/home`, () => HttpResponse.json(HOME)),
  );
});

describe('home page', () => {
  it('renders the sections the API sends, in order', async () => {
    renderRoutes(routes, '/');
    expect(await screen.findByRole('heading', { level: 1, name: 'Matchday gear for Phnom Penh' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Shop new arrivals' })).toHaveAttribute('href', '/collections/new-arrivals');

    const rail = screen.getByRole('region', { name: 'New arrivals' });
    expect(within(rail).getByRole('link', { name: /Product 2/ })).toHaveAttribute('href', '/p/product-2');
    expect(within(rail).getByRole('link', { name: 'See all' })).toHaveAttribute('href', '/shop?tag=new&sort=new');

    const grid = screen.getByRole('region', { name: 'Shop by category' });
    expect(await within(grid).findByRole('link', { name: /Jerseys/ })).toHaveAttribute('href', '/c/jerseys');

    const brands = screen.getByRole('region', { name: 'Brands' });
    expect(await within(brands).findByRole('link', { name: 'Puma' })).toHaveAttribute('href', '/brands/puma');
  });

  it('shows the stores with pickup', async () => {
    renderRoutes(routes, '/');
    const strip = await screen.findByRole('region', { name: 'Pick up from our stores' });
    expect(await within(strip).findByText('Sonthormuk')).toBeTruthy();
  });

  it('offers a retry when the home sections cannot load', async () => {
    server.use(http.get(`${API}/v1/catalog/home`, () => HttpResponse.json({ error: { code: 'internal', message: 'Busy' } }, { status: 500 })));
    renderRoutes(routes, '/');
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeTruthy();
  });
});
