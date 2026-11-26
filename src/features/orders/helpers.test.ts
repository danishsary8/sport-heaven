import { describe, expect, it } from 'vitest';
import { interpolate } from '../../lib/i18n/I18nProvider';
import { canReturn } from '../account/returns';
import type { MyOrder } from '../account/api';
import { legacyHashTarget } from '../../app/legacyHash';
import { mapsUrl } from '../pages/maps';
import type { Branch } from '../catalog/api';
import { confirmationMessage } from './confirmation';

const t = ((key: string, vars?: Record<string, string | number>) => interpolate(key, vars)) as Parameters<typeof confirmationMessage>[1];

describe('confirmationMessage', () => {
  it('thanks for a paid order and for a pickup reservation', () => {
    expect(confirmationMessage({ status: 'confirmed', paymentStatus: 'paid', fulfillment: 'delivery' }, t)).toBe('order.thanks');
    expect(confirmationMessage({ status: 'awaiting_pickup_payment', paymentStatus: 'unpaid', fulfillment: 'pickup' }, t)).toBe('order.thanksPickup');
  });

  it('says nothing for an unpaid order', () => {
    expect(confirmationMessage({ status: 'pending_payment', paymentStatus: 'unpaid', fulfillment: 'delivery' }, t)).toBeNull();
  });
});

describe('canReturn', () => {
  const now = Date.parse('2026-12-01T00:00:00Z');
  const order = (exchangeUntil: string | null, returnableQty: number) =>
    ({ returnWindow: exchangeUntil ? { exchangeUntil, refundUntil: exchangeUntil } : null, items: [{ returnableQty }] }) as unknown as MyOrder['order'];

  it('allows a return inside the window with something left to return', () => {
    expect(canReturn(order('2026-12-10T00:00:00Z', 1), now)).toBe(true);
  });

  it('refuses after the window, with nothing returnable, or before delivery', () => {
    expect(canReturn(order('2026-11-30T00:00:00Z', 1), now)).toBe(false);
    expect(canReturn(order('2026-12-10T00:00:00Z', 0), now)).toBe(false);
    expect(canReturn(order(null, 1), now)).toBe(false);
  });
});

describe('legacyHashTarget', () => {
  it('sends old hash links to the new pages', () => {
    expect(legacyHashTarget('#/products/F50-Elite')).toBe('/p/f50-elite');
    expect(legacyHashTarget('#/product/f50')).toBe('/p/f50');
    expect(legacyHashTarget('#/cart')).toBe('/');
  });

  it('leaves ordinary anchors alone', () => {
    expect(legacyHashTarget('#print')).toBeNull();
    expect(legacyHashTarget('')).toBeNull();
  });
});

describe('mapsUrl', () => {
  it('uses coordinates when the store has them, else its address', () => {
    expect(mapsUrl({ lat: 11.55, lng: 104.92, name: 'Sen Sok', address: 'Street 1986' } as Branch)).toBe('https://www.google.com/maps/search/?api=1&query=11.55%2C104.92');
    expect(mapsUrl({ lat: null, lng: null, name: 'Sen Sok', address: 'Street 1986' } as Branch)).toContain(encodeURIComponent('Sen Sok, Street 1986, Phnom Penh'));
  });
});
