import { fireEvent, screen, waitFor, within } from '@testing-library/react';
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
    // The carousel opens on the first campaign slide; the API's hero follows the campaign slides.
    expect(await screen.findByRole('heading', { level: 1, name: 'Wear your nation' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Go to slide 7' }));
    expect(screen.getByRole('heading', { name: 'Matchday gear for Phnom Penh' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Shop new arrivals' })).toHaveAttribute('href', '/collections/new-arrivals');

    const rail = screen.getByRole('region', { name: 'New arrivals' });
    expect(within(rail).getByRole('link', { name: /Product 2/ })).toHaveAttribute('href', '/p/product-2');
    expect(within(rail).getByRole('link', { name: 'See all' })).toHaveAttribute('href', '/shop?tag=new&sort=new');

    const grid = screen.getByRole('region', { name: 'Shop by category' });
    expect(await within(grid).findByRole('link', { name: /Jerseys/ })).toHaveAttribute('href', '/c/jerseys');

    const brands = screen.getByRole('region', { name: 'Brands' });
    expect(await within(brands).findByRole('link', { name: 'Puma' })).toHaveAttribute('href', '/brands/puma');
  });

  it("shows the Cambodia home jersey's current main photo on the Jerseys tile, and the built-in photo if it cannot load", async () => {
    server.use(
      http.get(`${API}/v1/catalog/products/cambodia-national-team-home-jersey-varaman`, () =>
        HttpResponse.json({ product: { ...product(9), imageUrl: 'https://api.test/v1/media/1ab9d92d-f03a-4bc3-bc8a-fa22029d0b28.webp' } }),
      ),
    );
    renderRoutes(routes, '/');
    const grid = await screen.findByRole('region', { name: 'Shop by category' });
    const tile = await within(grid).findByRole('link', { name: /Jerseys/ });
    await waitFor(() => expect(tile.querySelector('img')!.getAttribute('src')).toBe('https://api.test/v1/media/1ab9d92d-f03a-4bc3-bc8a-fa22029d0b28.webp'));
  });

  it('keeps the built-in Jerseys photo when the product cannot load', async () => {
    server.use(http.get(`${API}/v1/catalog/products/cambodia-national-team-home-jersey-varaman`, () => HttpResponse.json({ error: { code: 'not_found', message: 'x' } }, { status: 404 })));
    renderRoutes(routes, '/');
    const grid = await screen.findByRole('region', { name: 'Shop by category' });
    const tile = await within(grid).findByRole('link', { name: /Jerseys/ });
    await new Promise((r) => setTimeout(r, 50));
    expect(tile.querySelector('img')!.getAttribute('src')).toBe('/assets/catalog/jersey_cambodia_blue_1795112605589.jpg');
  });

  it('shows the stores with pickup', async () => {
    renderRoutes(routes, '/');
    const strip = await screen.findByRole('region', { name: 'Pick up from our stores' });
    expect(await within(strip).findByText('Sonthormuk')).toBeTruthy();
  });

  it('still renders when a section payload is malformed or of an unknown type', async () => {
    server.use(
      http.get(`${API}/v1/catalog/home`, () =>
        HttpResponse.json({
          sections: [
            { id: 'h', type: 'hero', payload: { title: 'Matchday gear', link: 'not-an-object' } },
            { id: 'g', type: 'category_grid', payload: { title: 'Shop by category', categories: 'boots' } },
            { id: 'x', type: 'video_wall', payload: {} },
          ],
        }),
      ),
    );
    renderRoutes(routes, '/');
    fireEvent.click(await screen.findByRole('button', { name: 'Go to slide 7' }));
    expect(screen.getByRole('heading', { name: 'Matchday gear' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Shop now' })).toHaveAttribute('href', '/shop');
    expect(screen.queryByRole('region', { name: 'Shop by category' })).toBeNull();
    expect(await screen.findByRole('region', { name: 'Pick up from our stores' })).toBeTruthy();
  });

  it('offers a retry when the home sections cannot load', async () => {
    server.use(http.get(`${API}/v1/catalog/home`, () => HttpResponse.json({ error: { code: 'internal', message: 'Busy' } }, { status: 500 })));
    renderRoutes(routes, '/');
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeTruthy();
  });
});
