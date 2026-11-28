import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../../app/routes';
import { configureApi } from '../../lib/api';
import { BRANCHES, MENU, cart, order } from '../../test/fixtures';
import { API, server, setupMsw } from '../../test/msw';
import { renderRoutes } from '../../test/render';
import { saveOrderAccess } from '../checkout/orderAccess';

setupMsw();

const reservedUntil = () => new Date(Date.now() + 20 * 60_000).toISOString();
const qrPayment = (over: Record<string, unknown> = {}) => ({
  attempt: 1,
  method: 'aba_khqr',
  status: 'pending',
  tranId: 'T1',
  amountCents: 9750,
  instructions: { kind: 'qr', qrString: 'FAKE-KHQR|T1|97.50|USD', deeplink: null, expiresAt: reservedUntil() },
  expiresAt: reservedUntil(),
  ...over,
});

let tokens: (string | null)[] = [];
let statusCalls = 0;
let paid = false;
let payments: unknown[] = [];

beforeEach(() => {
  tokens = [];
  statusCalls = 0;
  paid = false;
  payments = [];
  sessionStorage.clear();
  saveOrderAccess('SC-260001', { token: 'tok-1', phone: '012345678' });
  configureApi({ baseUrl: API });
  server.use(
    http.get(`${API}/v1/catalog/menu`, () => HttpResponse.json(MENU)),
    http.get(`${API}/v1/branches`, () => HttpResponse.json(BRANCHES)),
    http.get(`${API}/v1/cart`, () => HttpResponse.json(cart([]))),
    http.get(`${API}/v1/orders/SC-260001`, ({ request }) => {
      tokens.push(request.headers.get('x-order-token'));
      return HttpResponse.json({ order: paid ? order({ status: 'confirmed', paymentStatus: 'paid' }) : order({ reservedUntil: reservedUntil() }), payment: qrPayment() });
    }),
    http.get(`${API}/v1/orders/SC-260001/payment-status`, () => {
      statusCalls++;
      return HttpResponse.json({ status: paid ? 'confirmed' : 'pending_payment', paymentStatus: paid ? 'paid' : 'unpaid', latestPayment: qrPayment(paid ? { status: 'approved' } : {}), reservedUntil: reservedUntil() });
    }),
    http.post(`${API}/v1/orders/SC-260001/payments`, async ({ request }) => {
      payments.push(await request.json());
      return HttpResponse.json({ payment: qrPayment({ method: 'card', instructions: { kind: 'redirect', url: 'https://pay.example/checkout', method: 'POST', fields: { tran_id: 'T2' }, expiresAt: reservedUntil() } }) }, { status: 201 });
    }),
  );
});

describe('payment page', () => {
  it('shows the KHQR code with the amount in dollars and riel and the hold time', async () => {
    renderRoutes(routes, '/pay/SC-260001');
    expect(await screen.findByRole('img', { name: 'KHQR code for order SC-260001' })).toBeTruthy();
    expect(screen.getAllByText('$97.50').length).toBeGreaterThan(0);
    expect(screen.getByText('៛399,750')).toBeTruthy();
    expect(screen.getByText(/We're holding your items until/)).toBeTruthy();
    expect(tokens[0]).toBe('tok-1');
  });

  it('moves to the confirmation as soon as the payment is approved', async () => {
    const { router } = renderRoutes(routes, '/pay/SC-260001', { staleTime: 30_000 });
    await screen.findByRole('img', { name: 'KHQR code for order SC-260001' });
    paid = true;
    await waitFor(() => expect(router.state.location.pathname).toBe('/order/SC-260001'), { timeout: 5000 });
    expect(await screen.findByText('Thank you. Your order is confirmed.')).toBeTruthy();
    expect(statusCalls).toBeGreaterThan(0);
  });

  it('says the payment was received when the bank approved it but staff must check it, and never asks to pay again', async () => {
    server.use(
      http.get(`${API}/v1/orders/SC-260001/payment-status`, () =>
        HttpResponse.json({ status: 'pending_payment', paymentStatus: 'unpaid', latestPayment: qrPayment({ status: 'approved' }), reservedUntil: reservedUntil() }),
      ),
    );
    renderRoutes(routes, '/pay/SC-260001');
    expect(await screen.findByRole('heading', { name: 'We received your payment' })).toBeTruthy();
    expect(screen.getByText(/Please don't pay again/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Pay another way' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Credit or debit card' })).toBeNull();
    expect(screen.getByRole('link', { name: 'See your order' })).toHaveAttribute('href', '/order/SC-260001');
  });

  it('switches to card and sends the shopper to the card page', async () => {
    renderRoutes(routes, '/pay/SC-260001');
    fireEvent.click(await screen.findByRole('button', { name: 'Pay another way' }));
    fireEvent.click(screen.getByRole('button', { name: 'Credit or debit card' }));
    const go = await screen.findByRole('button', { name: 'Continue to card payment' });
    expect(payments).toEqual([{ method: 'card', contactPhone: '012345678', orderAccessToken: 'tok-1' }]);
    const form = go.closest('form')!;
    expect(form).toHaveAttribute('action', 'https://pay.example/checkout');
    expect(form.querySelector('input[name="tran_id"]')).toHaveValue('T2');
  });

  it('brings a card payer back from the bank to their order (the bank returns to one fixed address)', async () => {
    renderRoutes(routes, '/pay/SC-260001');
    fireEvent.click(await screen.findByRole('button', { name: 'Pay another way' }));
    fireEvent.click(screen.getByRole('button', { name: 'Credit or debit card' }));
    fireEvent.submit((await screen.findByRole('button', { name: 'Continue to card payment' })).closest('form')!);

    const { router } = renderRoutes(routes, '/checkout/return');
    await waitFor(() => expect(router.state.location.pathname).toBe('/pay/SC-260001'));
  });

  it('helps a card payer find the order when this tab does not know it', async () => {
    renderRoutes(routes, '/checkout/return');
    expect(await screen.findByRole('heading', { level: 1, name: 'Back from card payment' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Track your order' })).toHaveAttribute('href', '/track');
  });

  it('says when the hold ran out and offers the way back to the bag', async () => {
    server.use(
      http.get(`${API}/v1/orders/SC-260001`, () => HttpResponse.json({ order: order({ status: 'expired', reservedUntil: null }), payment: null })),
      http.get(`${API}/v1/orders/SC-260001/payment-status`, () => HttpResponse.json({ status: 'expired', paymentStatus: 'unpaid', latestPayment: null, reservedUntil: null })),
    );
    renderRoutes(routes, '/pay/SC-260001');
    expect(await screen.findByRole('heading', { name: 'The hold on your items ended' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Return to your bag' })).toHaveAttribute('href', '/bag');
  });

  it('asks a guest without access to find the order by tracking it', async () => {
    sessionStorage.clear();
    server.use(http.get(`${API}/v1/orders/SC-260001`, () => HttpResponse.json({ error: { code: 'not_found', message: 'Order not found' } }, { status: 404 })));
    renderRoutes(routes, '/pay/SC-260001');
    expect(await screen.findByRole('link', { name: 'Find your order' })).toHaveAttribute('href', '/track');
  });
});
