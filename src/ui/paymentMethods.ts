export type PaymentMarkKind = 'khqr' | 'visa' | 'mastercard' | 'cash';

/** Marks for one checkout payment method (cards show Visa and Mastercard). */
export const METHOD_MARKS: Record<string, PaymentMarkKind[]> = {
  aba_khqr: ['khqr'],
  card: ['visa', 'mastercard'],
  cash_on_pickup: ['cash'],
};
