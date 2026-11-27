import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '../lib/i18n';
import { cx } from './cx';
import { Picture } from './Picture';

type Tone = 'success' | 'error' | 'info';

export interface ToastAction {
  label: string;
  onClick(): void;
  /** The main next step: drawn as a filled button. */
  primary?: boolean;
}

export interface ToastInput {
  tone?: Tone;
  title: string;
  body?: string;
  /** A product photo: the alert then reads as "this item, done". */
  image?: string | null;
  actions?: ToastAction[];
  /** Milliseconds on screen; hovering or focusing the alert pauses it. */
  duration?: number;
}

interface ToastItem extends Required<Pick<ToastInput, 'tone' | 'title' | 'duration'>>, Omit<ToastInput, 'tone' | 'title' | 'duration'> {
  id: number;
  leaving: boolean;
}

interface ToastApi {
  success(message: string): void;
  error(message: string): void;
  show(input: ToastInput): void;
}

const ToastContext = createContext<ToastApi | null>(null);
const EXIT_MS = 220;

/**
 * Alerts after an action: what happened, and the next step when there is one ("View bag").
 * Success and info sit in a polite live region; errors are announced at once and stay longer.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.map((i) => (i.id === id ? { ...i, leaving: true } : i)));
    setTimeout(() => setItems((list) => list.filter((i) => i.id !== id)), EXIT_MS);
  }, []);

  const show = useCallback((input: ToastInput) => {
    const id = next.current++;
    const tone = input.tone ?? 'success';
    const duration = input.duration ?? (tone === 'error' ? 7000 : input.actions?.length ? 5500 : 4000);
    setItems((list) => [...list.filter((i) => !i.leaving).slice(-2), { ...input, id, tone, duration, leaving: false }]);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({ show, success: (title) => show({ tone: 'success', title }), error: (title) => show({ tone: 'error', title }) }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-3 top-[4.25rem] z-[70] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:top-[4.75rem] sm:items-end lg:top-[5.25rem]">
        {items.map((i) => (
          <ToastCard key={i.id} item={i} dismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info } as const;

function ToastCard({ item, dismiss }: { item: ToastItem; dismiss(id: number): void }) {
  const { t } = useI18n();
  const { id } = item;
  const onDismiss = useCallback(() => dismiss(id), [dismiss, id]);
  const ref = useRef<HTMLDivElement>(null);
  const Icon = ICONS[item.tone];

  // The timer pauses while the pointer or keyboard focus is on the alert (the bar pauses with it, in CSS).
  useEffect(() => {
    const el = ref.current;
    if (!el || item.leaving) return;
    let remaining = item.duration;
    let started = Date.now();
    let timer: ReturnType<typeof setTimeout> | null = setTimeout(onDismiss, remaining);
    const pause = () => {
      if (!timer) return;
      clearTimeout(timer);
      timer = null;
      remaining -= Date.now() - started;
    };
    const resume = () => {
      if (timer || el.matches(':hover') || el.contains(document.activeElement)) return;
      started = Date.now();
      timer = setTimeout(onDismiss, Math.max(remaining, 800));
    };
    el.addEventListener('pointerenter', pause);
    el.addEventListener('focusin', pause);
    el.addEventListener('pointerleave', resume);
    const blur = () => setTimeout(resume, 0);
    el.addEventListener('focusout', blur);
    return () => {
      if (timer) clearTimeout(timer);
      el.removeEventListener('pointerenter', pause);
      el.removeEventListener('focusin', pause);
      el.removeEventListener('pointerleave', resume);
      el.removeEventListener('focusout', blur);
    };
  }, [item.duration, item.leaving, onDismiss]);

  const rich = !!item.image || !!item.actions?.length;

  return (
    <div
      ref={ref}
      role={item.tone === 'error' ? 'alert' : 'status'}
      className={cx(
        'toast-card pointer-events-auto relative w-full max-w-[380px] overflow-hidden rounded-[12px] bg-obsidian text-paper shadow-[0_18px_40px_-14px_rgb(14_17_19/0.55),0_0_0_1px_rgb(255_255_255/0.06)_inset]',
        item.leaving ? 'animate-toast-out' : 'animate-toast-in',
      )}
    >
      <div className={cx('flex gap-3 p-3 pr-11', !rich && 'items-center')}>
        {item.image ? (
          <div className="stage relative h-[72px] w-14 shrink-0 overflow-hidden rounded-[8px]">
            <Picture src={item.image} alt="" sizes="56px" width={56} height={72} className="block h-full w-full" />
            <span className={cx('absolute -bottom-px -right-px grid size-5 place-items-center rounded-tl-[6px]', item.tone === 'error' ? 'bg-vermilion' : 'bg-success')}>
              <Icon className="size-3.5" aria-hidden />
            </span>
          </div>
        ) : (
          <span className={cx('grid size-8 shrink-0 place-items-center rounded-full', item.tone === 'error' ? 'bg-vermilion' : item.tone === 'info' ? 'bg-cobalt' : 'bg-success')}>
            <Icon className="size-[18px]" aria-hidden />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-snug">{item.title}</p>
          {item.body && <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-paper/70">{item.body}</p>}
          {item.actions?.length ? (
            <div className="mt-2.5 flex gap-2">
              {item.actions.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => {
                    a.onClick();
                    onDismiss();
                  }}
                  className={cx(
                    'h-9 rounded-[6px] px-3.5 text-[13px] font-semibold transition-colors',
                    a.primary ? 'bg-vermilion text-paper hover:bg-[#A91D25]' : 'bg-paper/10 text-paper hover:bg-paper/20',
                  )}
                >
                  {a.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <button type="button" onClick={onDismiss} aria-label={t('common.close')} className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-full text-paper/60 hover:bg-paper/10 hover:text-paper">
        <X className="size-4" aria-hidden />
      </button>
      <span aria-hidden className={cx('toast-timer absolute inset-x-0 bottom-0 block h-[3px]', item.tone === 'error' ? 'bg-vermilion' : 'bg-paper/35')} style={{ animationDuration: `${item.duration}ms` }} />
    </div>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
