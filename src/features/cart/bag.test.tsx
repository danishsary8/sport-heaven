import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../../app/routes';
import { configureApi } from '../../lib/api';
import { BRANCHES, MENU, cart, cartLine } from '../../test/fixtures';
import { API, server, setupMsw } from '../../test/msw';
import { renderRoutes } from '../../test/render';

setupMsw();

let patches: unknown[] = [];
let deletes: string[] = [];

beforeEach(() => {
  patches = [];
  deletes = [];
  configureApi({ baseUrl: API });
  server.use(
    http.get(`${API}/v1/catalog/menu`, () => HttpResponse.json(MENU)),
    http.get(`${API}/v1/branches`, () => HttpResponse.json(BRANCHES)),
    http.get(`${API}/v1/catalog/home`, () => HttpResponse.json({ sections: [] })),
    http.get(`${API}/v1/cart`, () => HttpResponse.json(cart([cartLine(1, { qty: 2, lineTotalCents: 19000 }), cartLine(2, { customPrint: { name: 'SOKHA', number: 7, patch: 'none', font: 'pro-condensed' }, printFeeCents: 800, lineTotalCents: 10300 })]))),
    http.get(`${API}/v1/geo/provinces`, () => HttpResponse.json({ provinces: [{ code: '12', nameEn: 'Phnom Penh', nameKm: 'ភ្នំពេញ' }, { code: '02', nameEn: 'Battambang', nameKm: 'បាត់ដំបង' }] })),
    http.patch(`${API}/v1/cart/items/:id`, async ({ request, params }) => {
      patches.push({ id: params.id, ...((await request.json()) as object) });
      return HttpResponse.json(cart([cartLine(1, { qty: 3, lineTotalCents: 28500 })]));
    }),
    http.delete(`${API}/v1/cart/items/:id`, ({ params }) => {
      deletes.push(String(params.id));
      return HttpResponse.json(cart([cartLine(2)]));
    }),
    http.put(`${API}/v1/cart/promo`, async ({ request }) => {
      const { code } = (await request.json()) as { code: string };
      if (code === 'NOPE') return HttpResponse.json({ error: { code: 'promo_invalid', message: 'This code is not valid.' } }, { status: 422 });
      return HttpResponse.json(cart([cartLine(1)], { totalCents: 8500, promo: { code, applied: true, message: '$10 off' }, discounts: [{ kind: 'promo', label: code, amountCents: 1000 }] }));
    }),
    http.post(`${API}/v1/checkout/quote`, () =>
      HttpResponse.json({
        ...cart([cartLine(1)]),
        shippingOptions: [{ methodId: 'province_courier', name: 'Province courier', available: true, feeCents: 300, eta: '2–3 days' }],
        pickupBranches: [],
        paymentMethods: ['aba_khqr'],
      }),
    ),
  );
});

describe('bag', () => {
  it('shows the lines, the print, the totals from the API and the hold notice', async () => {
    renderRoutes(routes, '/bag');
    expect(await screen.findByRole('heading', { level: 1, name: 'Your bag' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Product 1' })).toHaveAttribute('href', '/p/product-1');
    expect(screen.getByText('$190.00')).toBeTruthy();
    expect(screen.getByText(/SOKHA, number 7/)).toBeTruthy();
    expect(screen.getAllByText('$293.00').length).toBeGreaterThan(0);
    expect(screen.getByText("Items in your bag aren't reserved until you check out")).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Check out' })).toHaveAttribute('href', '/checkout');
  });

  it('says what delivery and printing cost in the totals', async () => {
    renderRoutes(routes, '/bag');
    const delivery = (await screen.findByText('Delivery')).closest('div')!;
    expect(delivery).toHaveTextContent('$2.00');
    expect(screen.getByText('Free if you pick up in store')).toBeTruthy();
    const printing = screen.getByText('Printing').closest('div')!;
    expect(printing).toHaveTextContent('$8.00');
  });

  it('changes the quantity and shows the bag the API returns', async () => {
    renderRoutes(routes, '/bag');
    const line = (await screen.findByRole('link', { name: 'Product 1' })).closest('li')!;
    fireEvent.click(within(line).getByRole('button', { name: 'Add one' }));
    await waitFor(() => expect(patches).toEqual([{ id: 'line1', qty: 3 }]));
    expect(await screen.findAllByText('$285.00')).toBeTruthy();
  });

  it('removes a line', async () => {
    renderRoutes(routes, '/bag');
    const line = (await screen.findByRole('link', { name: 'Product 1' })).closest('li')!;
    fireEvent.click(within(line).getByRole('button', { name: 'Remove Product 1' }));
    await waitFor(() => expect(deletes).toEqual(['line1']));
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Product 1' })).toBeNull());
  });

  it("shows the server's message for a bad promo code and the saving for a good one", async () => {
    renderRoutes(routes, '/bag');
    const field = await screen.findByLabelText('Promo code');
    fireEvent.change(field, { target: { value: 'NOPE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply code' }));
    expect(await screen.findByText('This code is not valid.')).toBeTruthy();
    fireEvent.change(field, { target: { value: 'SAVE10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply code' }));
    expect(await screen.findByText('$10 off')).toBeTruthy();
    expect(screen.getByText('−$10.00')).toBeTruthy();
  });

  it('explains a problem line and holds checkout until it is fixed', async () => {
    server.use(http.get(`${API}/v1/cart`, () => HttpResponse.json(cart([cartLine(1, { problem: 'unavailable', purchasable: false, availability: 'out' })]))));
    renderRoutes(routes, '/bag');
    expect(await screen.findByText('Sold out. Remove it to check out.')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Check out' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Check out' })).toBeDisabled();
  });

  it('estimates delivery for a province', async () => {
    renderRoutes(routes, '/bag');
    await screen.findByRole('option', { name: 'Battambang' });
    fireEvent.change(screen.getByLabelText('Estimate delivery to'), { target: { value: '02' } });
    expect(await screen.findByText(/Province courier/)).toBeTruthy();
    expect(screen.getByText('$3.00')).toBeTruthy();
  });

  it('opens the bag drawer from the header', async () => {
    renderRoutes(routes, '/');
    fireEvent.click(await screen.findByRole('link', { name: 'Bag, 3 items' }));
    const drawer = await screen.findByRole('dialog', { name: 'Your bag' });
    expect(await within(drawer).findByRole('link', { name: 'Product 1' })).toBeTruthy();
    expect(within(drawer).getByRole('link', { name: 'View bag' })).toHaveAttribute('href', '/bag');
  });

  it('applies quick removals in order, so a slow answer never brings a line back', async () => {
    server.use(
      http.delete(`${API}/v1/cart/items/:id`, async ({ params }) => {
        if (params.id === 'line1') {
          await new Promise((r) => setTimeout(r, 150));
          return HttpResponse.json(cart([cartLine(2)]));
        }
        return HttpResponse.json(cart([]));
      }),
    );
    renderRoutes(routes, '/bag');
    const one = (await screen.findByRole('link', { name: 'Product 1' })).closest('li')!;
    const two = screen.getByRole('link', { name: 'Product 2' }).closest('li')!;
    fireEvent.click(within(one).getByRole('button', { name: 'Remove Product 1' }));
    fireEvent.click(within(two).getByRole('button', { name: 'Remove Product 2' }));
    expect(await screen.findByRole('heading', { name: 'Your bag is empty' })).toBeTruthy();
    await new Promise((r) => setTimeout(r, 300));
    expect(screen.queryByRole('link', { name: 'Product 2' })).toBeNull();
  });

  it('says when the bag is empty', async () => {
    server.use(http.get(`${API}/v1/cart`, () => HttpResponse.json(cart([]))));
    renderRoutes(routes, '/bag');
    expect(await screen.findByRole('heading', { name: 'Your bag is empty' })).toBeTruthy();
    const browse = await screen.findByRole('navigation', { name: 'Or browse a category' });
    expect(within(browse).getByRole('link', { name: 'Boots' })).toHaveAttribute('href', '/c/boots');
  });

  it('closes the drawer when a link in the empty bag is followed', async () => {
    server.use(http.get(`${API}/v1/cart`, () => HttpResponse.json(cart([]))));
    const { router } = renderRoutes(routes, '/');
    fireEvent.click(await screen.findByRole('link', { name: 'Bag' }));
    const drawer = await screen.findByRole('dialog', { name: 'Your bag' });
    fireEvent.click(await within(drawer).findByRole('link', { name: 'Jerseys' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Your bag' })).toBeNull());
    expect(router.state.location.pathname).toBe('/c/jerseys');
  });
});
