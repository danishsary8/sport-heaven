import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useLocation } from 'react-router';

/** Hover must rest this long before a panel opens (so sweeping across the nav doesn't flash panels). */
export const OPEN_DELAY_MS = 120;
/** Leaving the nav or panel closes it after this long (so a diagonal move to the panel doesn't close it). */
export const CLOSE_DELAY_MS = 180;

/**
 * Which category's mega menu is open. Hover opens and closes with small delays; the chevron button
 * toggles for keyboard and touch; Escape closes; any navigation closes.
 */
export function useMegaMenu() {
  const [open, setOpen] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { pathname, search } = useLocation();

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const close = useCallback(() => {
    clear();
    setOpen(null);
  }, []);

  useEffect(close, [pathname, search, close]);
  useEffect(() => clear, []);

  return {
    open,
    close,
    /** Pointer over a category (or over a link without a panel, with null). */
    enter(slug: string | null) {
      clear();
      if (open !== null) setOpen(slug); // already browsing the menu: switch at once
      else if (slug !== null) timer.current = setTimeout(() => setOpen(slug), OPEN_DELAY_MS);
    },
    leave() {
      clear();
      timer.current = setTimeout(() => setOpen(null), CLOSE_DELAY_MS);
    },
    toggle(slug: string) {
      clear();
      setOpen((cur) => (cur === slug ? null : slug));
    },
    onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open !== null) {
        close();
        (e.target as HTMLElement).closest('nav')?.querySelector<HTMLButtonElement>(`[aria-label][aria-expanded="true"]`)?.focus();
      }
    },
  };
}
