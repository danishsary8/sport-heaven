import type { useI18n } from '../../lib/i18n';
import type { OrderView } from './api';

/** The thank-you line on a fresh order: paid and confirmed, or reserved for paying at the store. Null otherwise. */
export function confirmationMessage(o: Pick<OrderView, 'status' | 'paymentStatus' | 'fulfillment'>, t: ReturnType<typeof useI18n>['t']): string | null {
  if (o.status === 'awaiting_pickup_payment') return t('order.thanksPickup');
  if (o.paymentStatus === 'paid' && o.status === 'confirmed') return t('order.thanks');
  return null;
}
