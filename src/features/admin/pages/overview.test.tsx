import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../../../app/routes';
import { configureApi } from '../../../lib/api';
import { adminBase } from '../../../test/admin';
import { API, server, setupMsw } from '../../../test/msw';
import { renderRoutes } from '../../../test/render';

setupMsw();

const OVERVIEW = {
  today: { orders: 6, paidOrders: 5, revenueCents: 153000 },
  pendingPayments: 2,
  needsRefund: 0,
  awaitingFulfilment: { confirmed: 4, printing: 1, readyForPickup: 2, outForDelivery: 0 },
  openReturns: 0,
  pendingQuestions: 2,
  lowStockRows: 12,
  needsCountRows: 40,
  outboxFailed: 0,
  branch: null,
};
const sales = (days: number) => ({
  days: Array.from({ length: days }, (_, i) => ({ date: `2026-11-${String(i + 1).padStart(2, '0')}`, paidOrders: i % 3, revenueCents: (i % 3) * 9000 })),
  totals: { paidOrders: 12, revenueCents: 240000, averageOrderCents: 20000 },
  previous: { paidOrders: 10, revenueCents: 200000, averageOrderCents: 20000 },
  topProducts: [{ productId: 'p1', name: 'Predator Elite FG', imageUrl: null, qty: 3, revenueCents: 81000 }],
  byCategory: [{ slug: 'boots', name: 'Football Boots', revenueCents: 150000 }],
  branch: null,
});

let asked: string[] = [];
beforeEach(() => {
  asked = [];
  configureApi({ baseUrl: API });
  server.use(
    ...adminBase('admin'),
    http.get(`${API}/v1/admin/overview`, () => HttpResponse.json(OVERVIEW)),
    http.get(`${API}/v1/admin/overview/sales`, ({ request }) => {
      const days = Number(new URL(request.url).searchParams.get('days') ?? 14);
      asked.push(String(days));
      return HttpResponse.json(sales(days));
    }),
  );
});

describe('admin overview', () => {
  it('shows KPI cards for the period with the change against the period before', async () => {
    renderRoutes(routes, '/admin', { signedIn: true });
    const revenue = await screen.findByRole('group', { name: 'Takings' });
    expect(revenue).toHaveTextContent('$2,400.00');
    expect(revenue).toHaveTextContent('+20%');
    expect(screen.getByRole('group', { name: 'Paid orders' })).toHaveTextContent('12');
    expect(screen.getByRole('group', { name: 'Average order' })).toHaveTextContent('$200.00');
    expect(screen.getByText('Predator Elite FG')).toBeTruthy();
  });

  it('says "1 order", not "1 orders", in the today bar', async () => {
    server.use(http.get(`${API}/v1/admin/overview`, () => HttpResponse.json({ ...OVERVIEW, today: { orders: 1, paidOrders: 1, revenueCents: 25000 } })));
    renderRoutes(routes, '/admin', { signedIn: true });
    const today = await screen.findByRole('region', { name: 'Today' });
    expect(today).toHaveTextContent('1order');
    expect(today).not.toHaveTextContent('orders');
  });

  it('switches the chart range', async () => {
    renderRoutes(routes, '/admin', { signedIn: true });
    await screen.findByRole('group', { name: 'Takings' });
    fireEvent.click(screen.getByRole('radio', { name: '30 days' }));
    await waitFor(() => expect(asked).toContain('30'));
  });
});
