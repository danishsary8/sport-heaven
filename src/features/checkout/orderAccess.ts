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
