import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../../app/routes';
import { configureApi } from '../../lib/api';
import { BRANCHES, MENU, cart, order } from '../../test/fixtures';
import { API, server, setupMsw } from '../../test/msw';
import { renderRoutes } from '../../test/render';
import { readOrderAccess, saveOrderAccess } from '../checkout/orderAccess';

setupMsw();

let current = order();
let cancels: unknown[] = [];
let tracks: unknown[] = [];

beforeEach(() => {
  current = order();
  cancels = [];
  tracks = [];
  sessionStorage.clear();
  configureApi({ baseUrl: API });
  server.use(
    http.get(`${API}/v1/catalog/menu`, () => HttpResponse.json(MENU)),
    http.get(`${API}/v1/branches`, () => HttpResponse.json(BRANCHES)),
    http.get(`${API}/v1/cart`, () => HttpResponse.json(cart([]))),
    http.get(`${API}/v1/orders/SC-260001`, ({ request }) =>
      request.headers.get('x-order-token') === 'tok-1' ? HttpResponse.json({ order: current, payment: null }) : HttpResponse.json({ error: { code: 'not_found', message: 'Order not found' } }, { status: 404 }),
    ),
    http.post(`${API}/v1/orders/SC-260001/cancel`, async ({ request }) => {
      cancels.push(await request.json());
      current = order({ status: 'cancelled', timeline: [...current.timeline, { at: '2026-11-26T08:05:00Z', from: 'pending_payment', to: 'cancelled' }] });
      return HttpResponse.json({ order: current });
    }),
    http.post(`${API}/v1/orders/track`, async ({ request }) => {
      const body = (await request.json()) as { orderNumber: string };
      tracks.push(body);
      if (body.orderNumber !== 'SC-260001') return HttpResponse.json({ error: { code: 'not_found', message: 'No order matches that number and phone.' } }, { status: 404 });
      return HttpResponse.json({ order: { ...order(), contact: { name: 'D***', phone: '012 *** 678', channel: 'phone' }, shipAddress: null }, orderAccessToken: 'tok-1' });
    }),
  );
});

describe('order page', () => {
  it('shows an unpaid order with its items, total and a way to pay', async () => {
    saveOrderAccess('SC-260001', { token: 'tok-1', phone: '012345678' });
    renderRoutes(routes, '/order/SC-260001');
    expect(await screen.findByRole('heading', { level: 1, name: 'Order SC-260001' })).toBeTruthy();
    expect(screen.getAllByText('Waiting for payment').length).toBeGreaterThan(0);
    expect(screen.getByText('Product 1')).toBeTruthy();
    expect(screen.getAllByText('$97.50').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Pay now' })).toHaveAttribute('href', '/pay/SC-260001');
  });

  it('thanks the shopper once the order is paid and shows the timeline', async () => {
    saveOrderAccess('SC-260001', { token: 'tok-1', phone: '012345678' });
    current = order({ status: 'confirmed', paymentStatus: 'paid', paidAt: '2026-11-26T08:03:00Z', timeline: [{ at: '2026-11-26T08:00:00Z', from: null, to: 'pending_payment' }, { at: '2026-11-26T08:03:00Z', from: 'pending_payment', to: 'confirmed' }] });
    renderRoutes(routes, '/order/SC-260001');
    expect(await screen.findByText('Thank you. Your order is confirmed.')).toBeTruthy();
    const timeline = screen.getByRole('list', { name: 'Order progress' });
    expect(within(timeline).getByText('Confirmed')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Pay now' })).toBeNull();
  });

  it('cancels an unpaid order after asking', async () => {
    saveOrderAccess('SC-260001', { token: 'tok-1', phone: '012345678' });
    renderRoutes(routes, '/order/SC-260001');
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel order' }));
    const dialog = await screen.findByRole('dialog', { name: 'Cancel this order?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Yes, cancel it' }));
    await waitFor(() => expect(cancels).toEqual([{ contactPhone: '012345678', orderAccessToken: 'tok-1' }]));
    expect(await screen.findAllByText('Cancelled')).toBeTruthy();
  });

  it('asks people without access to find the order by tracking it', async () => {
    renderRoutes(routes, '/order/SC-260001');
    expect(await screen.findByRole('link', { name: 'Find your order' })).toHaveAttribute('href', '/track');
  });
});

describe('tracking', () => {
  it('finds an order by number and phone and lets an unpaid one be paid', async () => {
    renderRoutes(routes, '/track');
    fireEvent.change(await screen.findByLabelText('Order number'), { target: { value: 'sc-260001' } });
    fireEvent.change(screen.getByLabelText('Phone number used for the order'), { target: { value: '012 345 678' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find order' }));
    expect((await screen.findAllByText('Waiting for payment')).length).toBeGreaterThan(0);
    expect(tracks).toEqual([{ orderNumber: 'SC-260001', phone: '012 345 678' }]);
    expect(screen.getByRole('link', { name: 'Pay now' })).toHaveAttribute('href', '/pay/SC-260001');
    expect(readOrderAccess('SC-260001')).toEqual({ token: 'tok-1', phone: '012 345 678' });
  });

  it("shows the server's answer when nothing matches", async () => {
    renderRoutes(routes, '/track');
    fireEvent.change(await screen.findByLabelText('Order number'), { target: { value: 'SC-1' } });
    fireEvent.change(screen.getByLabelText('Phone number used for the order'), { target: { value: '012345678' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find order' }));
    expect(await screen.findByText('No order matches that number and phone.')).toBeTruthy();
  });
});
