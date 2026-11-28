import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../../../app/routes';
import { configureApi } from '../../../lib/api';
import { adminBase } from '../../../test/admin';
import { API, server, setupMsw } from '../../../test/msw';
import { renderRoutes } from '../../../test/render';

setupMsw();

const PROMO = { id: 'pr1', code: 'CASTLE10', name: '10% off', type: 'percent', value: 10, minSubtotalCents: 0, scope: {}, startsAt: null, endsAt: null, maxUses: null, usedCount: 3, maxUsesPerUser: null, active: true, createdAt: '2026-11-26T00:00:00Z' };
const RATE = { id: 'r1', methodId: 'pp_rider', provinceCode: '12', feeCents: 250, freeOverCents: 5000, etaI18n: { en: 'Same or next day' }, needsReview: false };
const SETTINGS = {
  online_safety_buffer: { units: 1 },
  payment_methods_enabled: { card: true, wing: false, acleda: false, aba_khqr: true, cash_on_pickup: false },
  reservation_minutes: { minutes: 30 },
  cash_on_pickup_hours: { hours: 48 },
  return_rules: { refundDays: 14, exchangeDays: 30, nonReturnable: ['socks', 'underwear'] },
  size_guides: {},
};

let calls: { method: string; url: string; body: unknown }[] = [];
const rec = (status = 200, reply: Record<string, unknown> = {}) => async ({ request }: { request: Request }) => {
  calls.push({ method: request.method, url: request.url.replace(API, ''), body: await request.json() });
  return HttpResponse.json(reply, { status });
};

beforeEach(() => {
  calls = [];
  configureApi({ baseUrl: API });
  server.use(
    ...adminBase('admin'),
    http.get(`${API}/v1/admin/promotions`, () => HttpResponse.json({ promotions: [PROMO] })),
    http.post(`${API}/v1/admin/promotions`, rec(201, { promotion: PROMO })),
    http.patch(`${API}/v1/admin/promotions/:id`, rec(200, { promotion: PROMO })),
    http.get(`${API}/v1/admin/shipping-rates`, () => HttpResponse.json({ rates: [RATE] })),
    http.put(`${API}/v1/admin/shipping-rates/:id`, rec(200, { rate: RATE })),
    http.get(`${API}/v1/admin/settings`, () => HttpResponse.json({ settings: SETTINGS })),
    http.put(`${API}/v1/admin/settings/:key`, rec()),
    http.get(`${API}/v1/admin/settings/pricing`, () => HttpResponse.json({ settings: { khr_rate: { rate: 4100 } } })),
    http.put(`${API}/v1/admin/settings/pricing/:key`, rec()),
  );
});

describe('admin promotions, delivery and settings', () => {
  it('switches a promo code off and creates a new one', async () => {
    renderRoutes(routes, '/admin/promotions', { signedIn: true });
    const row = await screen.findByRole('listitem', { name: /CASTLE10/ });
    fireEvent.click(within(row).getByRole('button', { name: 'Turn off CASTLE10' }));
    await waitFor(() => expect(calls).toContainEqual({ method: 'PATCH', url: '/v1/admin/promotions/pr1', body: { active: false } }));
    fireEvent.change(screen.getByLabelText('Code'), { target: { value: 'sale5' } });
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Five off' } });
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'fixed' } });
    fireEvent.change(screen.getByLabelText('Amount off (USD)'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create code' }));
    await waitFor(() =>
      expect(calls).toContainEqual({ method: 'POST', url: '/v1/admin/promotions', body: { code: 'SALE5', name: 'Five off', type: 'fixed', value: 500, minSubtotalCents: 0, active: true } }),
    );
  });

  it('changes a delivery fee', async () => {
    renderRoutes(routes, '/admin/delivery', { signedIn: true });
    const row = await screen.findByRole('listitem', { name: /Phnom Penh rider/ });
    fireEvent.change(within(row).getByLabelText('Fee (USD)'), { target: { value: '3.00' } });
    fireEvent.click(within(row).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(calls).toContainEqual({ method: 'PUT', url: '/v1/admin/shipping-rates/r1', body: { feeCents: 300, freeOverCents: 5000, etaEn: 'Same or next day' } }));
  });

  it('turns the .90 price rule off and on with one switch', async () => {
    renderRoutes(routes, '/admin/settings', { signedIn: true });
    const rule = await screen.findByRole('switch', { name: 'End prices in .90' });
    expect(rule).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(rule);
    await waitFor(() => expect(calls).toContainEqual({ method: 'PUT', url: '/v1/admin/settings/price_rounding', body: { endInNinety: false } }));
  });

  it('turns on cash on pickup, changes the hold time and the riel rate', async () => {
    renderRoutes(routes, '/admin/settings', { signedIn: true });
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Cash on pickup' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save payment methods' }));
    await waitFor(() =>
      expect(calls).toContainEqual({ method: 'PUT', url: '/v1/admin/settings/payment_methods_enabled', body: { card: true, wing: false, acleda: false, aba_khqr: true, cash_on_pickup: true } }),
    );
    fireEvent.change(screen.getByLabelText('Hold items while paying (minutes)'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save hold time' }));
    await waitFor(() => expect(calls).toContainEqual({ method: 'PUT', url: '/v1/admin/settings/reservation_minutes', body: { minutes: 20 } }));
    fireEvent.change(await screen.findByLabelText('Riel per dollar'), { target: { value: '4050' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save rate' }));
    await waitFor(() => expect(calls).toContainEqual({ method: 'PUT', url: '/v1/admin/settings/pricing/khr_rate', body: { rate: 4050 } }));
  });
});
