import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { cx } from './cx';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface SheetProps {
  open: boolean;
  onClose(): void;
  side?: 'left' | 'right' | 'bottom' | 'center' | 'top';
  title: string;
  /** Hide the visible title (it stays the dialog's accessible name). */
  hideTitle?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

const EXIT_MS = 240;
const ENTER = { left: 'animate-sheet-left', right: 'animate-sheet-right', top: 'animate-sheet-top', bottom: 'animate-sheet-bottom', center: 'animate-pop-in' } as const;
const EXIT = { left: 'animate-sheet-out-left', right: 'animate-sheet-out-right', top: 'animate-sheet-out-top', bottom: 'animate-sheet-out-bottom', center: 'animate-pop-out' } as const;

/** A modal panel (menu, filters, bag, dialogs): traps focus, closes on Escape or backdrop, restores focus. */
export function Sheet({ open, onClose, side = 'right', title, hideTitle, children, footer, className }: SheetProps) {
  const { t } = useI18n();
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const first = panel.current?.querySelector<HTMLElement>("[data-autofocus]") ?? panel.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel.current)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) return;
      const [a, b] = [items[0]!, items[items.length - 1]!];
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        b.focus();
      } else if (!e.shiftKey && document.activeElement === b) {
        e.preventDefault();
        a.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [open]);

  // After closing, the panel stays for its exit animation: inert and no longer a dialog, then it is removed.
  const [present, setPresent] = useState(open);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setPresent(true);
  }
  useEffect(() => {
    if (open || !present) return;
    const id = setTimeout(() => setPresent(false), EXIT_MS);
    return () => clearTimeout(id);
  }, [open, present]);

  if (!open && !present) return null;
  const closing = !open;

  const position = {
    left: 'inset-y-0 left-0 w-[min(88vw,380px)]',
    right: 'inset-y-0 right-0 w-[min(92vw,440px)]',
    top: 'inset-x-0 top-0 max-h-[92vh] rounded-b-[14px]',
    bottom: 'inset-x-0 bottom-0 max-h-[88vh] rounded-t-[14px]',
    center: 'left-1/2 top-1/2 w-[min(92vw,520px)] max-h-[88vh] -translate-x-1/2 -translate-y-1/2 rounded-[12px]',
  }[side];
  const motion = (closing ? EXIT : ENTER)[side];

  return createPortal(
    <div className={cx('fixed inset-0 z-50', closing && 'pointer-events-none')} data-sheet={closing ? 'closing' : 'open'} inert={closing || undefined}>
      <div className={cx('absolute inset-0 bg-obsidian/45', closing ? 'animate-fade-out' : 'animate-fade')} onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role={closing ? undefined : 'dialog'}
        aria-modal={closing ? undefined : 'true'}
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx('absolute flex flex-col bg-paper shadow-[0_10px_40px_rgba(14,17,19,0.25)] outline-none', position, motion, className)}
      >
        <div className={cx('flex items-center justify-between gap-4 px-5 pt-4 pb-3', hideTitle && 'absolute right-0 top-0 z-10')}>
          <h2 id={titleId} className={cx('font-display text-2xl font-bold leading-none', hideTitle && 'sr-only')}>
            {title}
          </h2>
          <button type="button" onClick={onClose} className="-mr-2 grid size-10 place-items-center rounded-full hover:bg-stone" aria-label={t('common.close')}>
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
        {footer && <div className="border-t border-stone px-5 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
