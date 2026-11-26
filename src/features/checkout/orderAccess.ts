/**
 * A guest's order token and phone, kept for this tab only (sessionStorage) so the order and payment pages can
 * read the order and switch payment or cancel. Never in the URL, never in localStorage.
 */
export interface OrderAccess {
  token: string;
  phone: string;
}

const key = (number: string) => `sc.order.${number}`;

export function saveOrderAccess(number: string, access: OrderAccess): void {
  try {
    sessionStorage.setItem(key(number), JSON.stringify(access));
  } catch {
    // storage blocked: the order page will ask for the phone number instead
  }
}

export function readOrderAccess(number: string): OrderAccess | null {
  try {
    const raw = sessionStorage.getItem(key(number));
    return raw ? (JSON.parse(raw) as OrderAccess) : null;
  } catch {
    return null;
  }
}

/**
 * PayWay sends card payers back to one fixed address (`/checkout/return`) without the order number, so the pay
 * page remembers the order for this tab just before handing over to the bank.
 */
const CARD_RETURN = 'sc.cardReturn';

export function rememberCardReturn(number: string): void {
  try {
    sessionStorage.setItem(CARD_RETURN, number);
  } catch {
    // storage blocked: the return page offers order tracking instead
  }
}

export function readCardReturn(): string | null {
  try {
    return sessionStorage.getItem(CARD_RETURN);
  } catch {
    return null;
  }
}
