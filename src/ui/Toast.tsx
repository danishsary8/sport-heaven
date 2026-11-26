import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { cx } from './cx';

type Tone = 'success' | 'error';
interface ToastItem {
  id: number;
  tone: Tone;
  message: string;
}
interface ToastApi {
  success(message: string): void;
  error(message: string): void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Short confirmations ("Added to your bag") in a polite live region; errors stay a little longer. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);
  const push = useCallback((tone: Tone, message: string) => {
    const id = next.current++;
    setItems((list) => [...list.slice(-2), { id, tone, message }]);
    setTimeout(() => setItems((list) => list.filter((i) => i.id !== id)), tone === 'error' ? 7000 : 4000);
  }, []);
  const api = useMemo<ToastApi>(() => ({ success: (m) => push('success', m), error: (m) => push('error', m) }), [push]);
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 top-[4.25rem] z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:top-auto sm:bottom-6 sm:right-6 sm:items-end">
        {items.map((i) => (
          <p
            key={i.id}
            role={i.tone === 'error' ? 'alert' : 'status'}
            className={cx('animate-fade rounded-[8px] px-4 py-3 text-[15px] font-medium shadow-lg', i.tone === 'error' ? 'bg-vermilion text-paper' : 'bg-obsidian text-paper')}
          >
            {i.message}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
