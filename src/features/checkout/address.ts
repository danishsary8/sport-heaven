/** The address form's value and the client-side checks it gets before the server validates it. */

export interface AddressDraft {
  recipientName: string;
  phone: string;
  provinceCode: string;
  districtCode: string;
  communeCode: string;
  street: string;
  landmark: string;
}

/** A blank address form. */
export const EMPTY_ADDRESS: AddressDraft = { recipientName: '', phone: '', provinceCode: '', districtCode: '', communeCode: '', street: '', landmark: '' };

/** Cambodian numbers: 0XX XXX XXX(X) or +855 XX XXX XXX(X). The server is the authority; this catches typos early. */
export function looksLikePhone(v: string): boolean {
  const d = v.replace(/[\s()-]/g, '');
  return /^(\+855|855|0)\d{8,9}$/.test(d) || /^\+\d{8,15}$/.test(d);
}
