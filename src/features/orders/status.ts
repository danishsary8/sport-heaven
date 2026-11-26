import type { DictKey, useI18n } from '../../lib/i18n';

/** The shopper-facing name of an order status, e.g. "pending_payment" → "Waiting for payment". */
export function statusLabel(status: string, t: ReturnType<typeof useI18n>['t']): string {
  return t(`status.${status}` as DictKey);
}
