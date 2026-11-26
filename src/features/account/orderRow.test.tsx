import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../../lib/i18n';
import { OrderList, type OrderSummary } from './OrderRow';

const base: OrderSummary = {
  number: 'SC-2611-AAAAA',
  status: 'delivered',
  paymentStatus: 'paid',
  fulfillment: 'delivery',
  totalCents: 9750,
  itemCount: 1,
  firstItem: { name: 'Product 1', imageUrl: null },
  createdAt: '2026-11-20T00:00:00Z',
} as OrderSummary;

function renderList(orders: OrderSummary[]) {
  const router = createMemoryRouter([{ path: '/', element: <OrderList orders={orders} /> }]);
  return render(
    <I18nProvider initial="en">
      <RouterProvider router={router} />
    </I18nProvider>,
  );
}

describe('OrderRow', () => {
  it('links to the order and shows what, when, how much and the status', () => {
    renderList([base]);
    const link = screen.getByRole('link', { name: /SC-2611-AAAAA/ });
    expect(link).toHaveAttribute('href', '/account/orders/SC-2611-AAAAA');
    expect(link).toHaveTextContent('Product 1');
    expect(link).toHaveTextContent('$97.50');
    expect(link).toHaveTextContent('Delivered');
  });

  it('summarises orders with several items', () => {
    renderList([{ ...base, number: 'SC-2611-BBBBB', itemCount: 3 }]);
    expect(screen.getByRole('link', { name: /SC-2611-BBBBB/ })).toHaveTextContent(/Product 1.*2/);
  });

  it('copes with an order that has no first item', () => {
    renderList([{ ...base, firstItem: null } as unknown as OrderSummary]);
    expect(screen.getByRole('link', { name: /SC-2611-AAAAA/ })).toBeTruthy();
  });
});
