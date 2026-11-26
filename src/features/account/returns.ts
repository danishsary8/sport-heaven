import type { MyOrder } from './api';

/** Items can be returned while the exchange window is open and something is still returnable. */
export function canReturn(order: MyOrder['order'], now = Date.now()): boolean {
  return !!order.returnWindow && new Date(order.returnWindow.exchangeUntil).getTime() > now && order.items.some((i) => i.returnableQty > 0);
}
