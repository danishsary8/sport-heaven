import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../../app/routes';
import { configureApi } from '../../lib/api';
import { ADDRESS, BRANCHES, GEO, MENU, cart, cartLine, order, sessionFor } from '../../test/fixtures';
import { API, server, setupMsw } from '../../test/msw';
import { renderRoutes } from '../../test/render';

setupMsw();

let quotes: Record<string, unknown>[] = [];
let orders: { body: Record<string, unknown>; key: string | null }[] = [];

const QUOTE_EXTRA = {
  shippingOptions: [
    { methodId: 'pp_rider', name: 'Phnom Penh rider', available: true, feeCents: 250, eta: 'Same or next day' },
    { methodId: 'province_courier', name: 'Province courier', available: false, feeCents: null, eta: null },
  ],
  pickupBranches: [
    { id: 'sensok', name: 'Sen Sok Pitch Hub' },
    { id: 'sonthormuk', name: 'Sonthormuk Flagship' },
  ],
  paymentMethods: ['aba_khqr', 'card', 'cash_on_pickup'],
};

beforeEach(() => {
  quotes = [];
  orders = [];
  sessionStorage.clear();
  configureApi({ baseUrl: API });
  server.use(
    http.get(`${API}/v1/catalog/menu`, () => HttpResponse.json(MENU)),
    http.get(`${API}/v1/branches`, () => HttpResponse.json(BRANCHES)),
    http.get(`${API}/v1/cart`, () => HttpResponse.json(cart([cartLine(1)]))),
    http.get(`${API}/v1/geo/provinces`, () => HttpResponse.json(GEO.provinces)),
    http.get(`${API}/v1/geo/districts`, () => HttpResponse.json(GEO.districts)),
    http.get(`${API}/v1/geo/communes`, () => HttpResponse.json(GEO.communes)),
    http.post(`${API}/v1/checkout/quote`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      quotes.push(body);
      const shipping = body.shippingMethodId === 'pp_rider' ? 250 : 0;
      const base = cart([cartLine(1)]);
      return HttpResponse.json({ cart: { ...base.cart, pricing: { ...base.cart.pricing, shippingCents: shipping, totalCents: 9500 + shipping, totalKhr: (9500 + shipping) * 41 } }, ...QUOTE_EXTRA });
    }),
    http.post(`${API}/v1/orders`, async ({ request }) => {
      orders.push({ body: (await request.json()) as Record<string, unknown>, key: request.headers.get('idempotency-key') });
      return HttpResponse.json({ order: order(), payment: null, paymentError: null, orderAccessToken: 'tok-123' }, { status: 201 });
    }),
  );
});

async function fillGuestDelivery() {
  fireEvent.change(await screen.findByLabelText('Full name'), { target: { value: 'Dara Sok' } });
  fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '012 345 678' } });
  await screen.findByRole('option', { name: 'Phnom Penh' });
  fireEvent.change(screen.getByLabelText('Province or city'), { target: { value: '12' } });
  await screen.findByRole('option', { name: 'Chamkar Mon' });
  fireEvent.change(screen.getByLabelText('District'), { target: { value: '1201' } });
  await screen.findByRole('option', { name: 'Tonle Bassac' });
  fireEvent.change(screen.getByLabelText('Commune'), { target: { value: '120101' } });
  fireEvent.change(screen.getByLabelText('Street, house and floor'), { target: { value: 'St 51, house 12' } });
  fireEvent.click(await screen.findByRole('radio', { name: /Phnom Penh rider/ }));
  fireEvent.click(screen.getByRole('radio', { name: /ABA KHQR/ }));
  fireEvent.click(screen.getByRole('checkbox', { name: /I agree to the terms/ }));
}

describe('checkout', () => {
  it('explains what is missing before sending anything', async () => {
    renderRoutes(routes, '/checkout');
    fireEvent.click(await screen.findByRole('button', { name: 'Place order' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Check the highlighted fields');
    expect(screen.getByText('Enter your name.')).toBeTruthy();
    expect(screen.getByText('Enter a phone number we can call.')).toBeTruthy();
    expect(orders).toEqual([]);
  });

  it('places a guest delivery order with a fresh idempotency key and goes to payment', async () => {
    const { router } = renderRoutes(routes, '/checkout');
    await fillGuestDelivery();
    await waitFor(() => expect(quotes.some((q) => q.shippingMethodId === 'pp_rider' && q.provinceCode === '12')).toBe(true));
    const summary = screen.getByRole('complementary', { name: 'Order summary' });
    expect(await within(summary).findByText('$97.50')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Place order' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/pay/SC-260001'));
    const { body, key } = orders[0]!;
    expect(key).toMatch(/[0-9a-f-]{36}/);
    expect(body).toMatchObject({
      contact: { name: 'Dara Sok', phone: '012 345 678', channel: 'phone' },
      fulfillment: 'delivery',
      shippingMethodId: 'pp_rider',
      paymentMethod: 'aba_khqr',
      acceptTerms: true,
      address: { recipientName: 'Dara Sok', phone: '012 345 678', provinceCode: '12', districtCode: '1201', communeCode: '120101', street: 'St 51, house 12' },
    });
    expect(JSON.parse(sessionStorage.getItem('sc.order.SC-260001')!)).toEqual({ token: 'tok-123', phone: '012 345 678' });
  });

  it('places a pickup order for cash at the store and goes to the order page', async () => {
    server.use(
      http.post(`${API}/v1/orders`, async ({ request }) => {
        orders.push({ body: (await request.json()) as Record<string, unknown>, key: request.headers.get('idempotency-key') });
        return HttpResponse.json({ order: order({ fulfillment: 'pickup', paymentMethod: 'cash_on_pickup', status: 'awaiting_pickup_payment' }), payment: null, paymentError: null, orderAccessToken: 'tok-9' }, { status: 201 });
      }),
    );
    const { router } = renderRoutes(routes, '/checkout');
    fireEvent.change(await screen.findByLabelText('Full name'), { target: { value: 'Dara' } });
    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '012345678' } });
    fireEvent.click(screen.getByRole('radio', { name: /Pick up in store/ }));
    fireEvent.click(await screen.findByRole('radio', { name: 'Sen Sok Pitch Hub' }));
    fireEvent.click(screen.getByRole('radio', { name: /Cash when you pick up/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /I agree to the terms/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Place order' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/order/SC-260001'));
    expect(orders[0]!.body).toMatchObject({ fulfillment: 'pickup', pickupBranchId: 'sensok', paymentMethod: 'cash_on_pickup' });
    expect(orders[0]!.body.address).toBeUndefined();
  });

  it('explains when delivery has no way to pay (cash-only shop) and switches to pickup', async () => {
    server.use(
      http.post(`${API}/v1/checkout/quote`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        const methods = body.fulfillment === 'pickup' ? ['cash_on_pickup'] : [];
        return HttpResponse.json({ ...cart([cartLine(1)]), ...QUOTE_EXTRA, paymentMethods: methods });
      }),
    );
    renderRoutes(routes, '/checkout');
    expect(await screen.findByText('Online payment is not available yet')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Pick up in store instead' }));
    expect(screen.getByRole('radio', { name: /Pick up in store/ })).toBeChecked();
    expect(await screen.findByRole('radio', { name: /Cash when you pick up/ })).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('Online payment is not available yet')).toBeNull());
  });

  it("shows the server's field errors next to the fields", async () => {
    server.use(http.post(`${API}/v1/orders`, () => HttpResponse.json({ error: { code: 'validation_failed', message: 'Validation failed', details: [{ path: 'contact.phone', message: 'Enter a Cambodian mobile number.' }] } }, { status: 422 })));
    renderRoutes(routes, '/checkout');
    await fillGuestDelivery();
    fireEvent.click(screen.getByRole('button', { name: 'Place order' }));
    expect(await screen.findByText('Enter a Cambodian mobile number.')).toBeTruthy();
    expect(screen.getByLabelText('Phone number')).toHaveAttribute('aria-invalid', 'true');
  });

  it('keeps the same key when the connection fails and uses a new one after a refusal', async () => {
    let n = 0;
    server.use(
      http.post(`${API}/v1/orders`, ({ request }) => {
        orders.push({ body: {}, key: request.headers.get('idempotency-key') });
        n++;
        if (n === 1) return HttpResponse.json({ error: { code: 'internal', message: 'Busy' } }, { status: 503 });
        return HttpResponse.json({ error: { code: 'insufficient_stock', message: 'Only 1 left in EU 41.' } }, { status: 409 });
      }),
    );
    renderRoutes(routes, '/checkout');
    await fillGuestDelivery();
    const place = screen.getByRole('button', { name: 'Place order' });
    fireEvent.click(place);
    await screen.findByText('Busy');
    fireEvent.click(place);
    expect(await screen.findByText('Only 1 left in EU 41.')).toBeTruthy();
    fireEvent.click(place);
    await waitFor(() => expect(orders.length).toBe(3));
    expect(orders[1]!.key).toBe(orders[0]!.key);
    expect(orders[2]!.key).not.toBe(orders[1]!.key);
  });

  it('uses a new key when the shopper changes the order after a failed attempt', async () => {
    server.use(
      http.post(`${API}/v1/orders`, ({ request }) => {
        orders.push({ body: {}, key: request.headers.get('idempotency-key') });
        return HttpResponse.json({ error: { code: 'internal', message: 'Busy' } }, { status: 503 });
      }),
    );
    renderRoutes(routes, '/checkout');
    await fillGuestDelivery();
    fireEvent.click(screen.getByRole('button', { name: 'Place order' }));
    await screen.findByText('Busy');
    fireEvent.change(screen.getByLabelText('Note for the shop (optional)'), { target: { value: 'Call first' } });
    fireEvent.click(screen.getByRole('button', { name: 'Place order' }));
    await waitFor(() => expect(orders.length).toBe(2));
    expect(orders[1]!.key).not.toBe(orders[0]!.key);
  });

  it('says when the province list cannot load and offers a retry', async () => {
    server.use(http.get(`${API}/v1/geo/provinces`, () => HttpResponse.json({ error: { code: 'internal', message: 'x' } }, { status: 500 })));
    renderRoutes(routes, '/checkout');
    expect(await screen.findByText("The list of places didn't load.")).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Load the places again' })).toBeTruthy();
  });

  it('lets a member pick a saved address', async () => {
    server.use(
      http.post(`${API}/v1/auth/session`, () => HttpResponse.json(sessionFor())),
      http.get(`${API}/v1/me/addresses`, () => HttpResponse.json({ addresses: [ADDRESS] })),
    );
    renderRoutes(routes, '/checkout', { signedIn: true });
    expect(await screen.findByRole('radio', { name: /St 51, house 12/ })).toBeChecked();
    expect(screen.getByLabelText('Full name')).toHaveValue('Dara Sok');
    fireEvent.click(await screen.findByRole('radio', { name: /Phnom Penh rider/ }));
    fireEvent.click(screen.getByRole('radio', { name: /ABA KHQR/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /I agree to the terms/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Place order' }));
    await waitFor(() => expect(orders.length).toBe(1));
    expect(orders[0]!.body).toMatchObject({ addressId: ADDRESS.id, contact: { name: 'Dara Sok', phone: '+85512345678' } });
  });

  it('updates the totals when a promo code is applied at checkout', async () => {
    let promoOn = false;
    server.use(
      http.put(`${API}/v1/cart/promo`, () => {
        promoOn = true;
        return HttpResponse.json(cart([cartLine(1)], { totalCents: 8500, promo: { code: 'SAVE10', applied: true, message: '$10 off' }, discounts: [{ kind: 'promo', label: 'SAVE10', amountCents: 1000 }] }));
      }),
      http.post(`${API}/v1/checkout/quote`, () => {
        const c = promoOn ? cart([cartLine(1)], { totalCents: 8500, promo: { code: 'SAVE10', applied: true, message: '$10 off' }, discounts: [{ kind: 'promo', label: 'SAVE10', amountCents: 1000 }] }) : cart([cartLine(1)]);
        return HttpResponse.json({ ...c, ...QUOTE_EXTRA });
      }),
    );
    renderRoutes(routes, '/checkout', { staleTime: 30_000 });
    const summary = await screen.findByRole('complementary', { name: 'Order summary' });
    fireEvent.change(within(summary).getByLabelText('Promo code'), { target: { value: 'SAVE10' } });
    fireEvent.click(within(summary).getByRole('button', { name: 'Apply code' }));
    expect(await within(summary).findByText('Code SAVE10 applied')).toBeTruthy();
    expect(await within(summary).findByText('−$10.00')).toBeTruthy();
  });

  it('sends people with an empty bag back to the bag', async () => {
    server.use(http.get(`${API}/v1/cart`, () => HttpResponse.json(cart([]))));
    renderRoutes(routes, '/checkout');
    expect(await screen.findByRole('heading', { name: 'Your bag is empty' })).toBeTruthy();
  });
});
