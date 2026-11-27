import { Banknote } from 'lucide-react';
import { cx } from './cx';
import type { PaymentMarkKind } from './paymentMethods';

/**
 * Acceptance marks for the ways to pay, drawn as small inline SVGs (no image requests).
 * Colours follow each scheme's published marks: KHQR red, Visa blue, Mastercard red and yellow.
 */

const frame = 'inline-flex h-7 shrink-0 items-center justify-center rounded-[4px] border border-[#D9D5CC] bg-white';

export function PaymentMark({ kind, className }: { kind: PaymentMarkKind; className?: string }) {
  switch (kind) {
    case 'khqr':
      return (
        <span className={cx(frame, 'w-12 overflow-hidden', className)} style={{ background: '#E1232E', borderColor: '#E1232E' }} aria-hidden>
          <svg viewBox="0 0 48 28" className="h-full w-full">
            <text x="24" y="18.5" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="11" fill="#fff" letterSpacing="0.5">
              KHQR
            </text>
            <path d="M40 0h8v8z" fill="#fff" opacity="0.9" />
          </svg>
        </span>
      );
    case 'visa':
      return (
        <span className={cx(frame, 'w-12', className)} aria-hidden>
          <svg viewBox="0 0 48 28" className="h-full w-full">
            <text x="24" y="19" textAnchor="middle" fontFamily="Arial Black, Arial, Helvetica, sans-serif" fontStyle="italic" fontWeight="900" fontSize="13" fill="#1A1F71" letterSpacing="-0.3">
              VISA
            </text>
          </svg>
        </span>
      );
    case 'mastercard':
      return (
        <span className={cx(frame, 'w-12', className)} aria-hidden>
          <svg viewBox="0 0 48 28" className="h-full w-full">
            <circle cx="19.5" cy="14" r="8" fill="#EB001B" />
            <circle cx="28.5" cy="14" r="8" fill="#F79E1B" />
            <path d="M24 7.4a8 8 0 0 1 0 13.2a8 8 0 0 1 0-13.2z" fill="#FF5F00" />
          </svg>
        </span>
      );
    case 'cash':
      return (
        <span className={cx(frame, 'w-12 text-success', className)} aria-hidden>
          <Banknote className="size-5" />
        </span>
      );
  }
}

export function PaymentMarks({ kinds, className }: { kinds: PaymentMarkKind[]; className?: string }) {
  if (!kinds.length) return null;
  return (
    <span className={cx('flex items-center gap-1.5', className)}>
      {kinds.map((k) => (
        <PaymentMark key={k} kind={k} />
      ))}
    </span>
  );
}
