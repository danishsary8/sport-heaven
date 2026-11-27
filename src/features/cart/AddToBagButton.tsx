import { ShoppingBag } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { isApiError } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { cx, useToast } from '../../ui';
import { openBag } from './bagEvents';
import { flyToBag } from './flyToBag';

type Phase = 'idle' | 'busy' | 'done';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * The add-to-bag button. Pressed, it closes into a round bag while the bag is saved, then that circle
 * flies to the header bag; the button reopens with a drawn tick ("Added"), then returns to normal.
 * `onAdd` does the saving and should reject when it fails (the button then simply reopens).
 */
export function AddToBagButton({
  onAdd,
  disabled = false,
  label,
  srLabel,
  tone = 'buy',
  size = 'lg',
  className,
  describedBy,
  onLanded,
}: {
  onAdd(): Promise<unknown>;
  /** Called when the flying bag reaches the header (at once with reduced motion). */
  onLanded?(): void;
  disabled?: boolean;
  label: string;
  /** A fuller name for screen readers, e.g. "Add size EU 41 to bag" when the button shows "Add to bag". */
  srLabel?: string;
  tone?: 'buy' | 'dark';
  size?: 'md' | 'lg';
  className?: string;
  describedBy?: string;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLButtonElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);

  const press = async () => {
    if (phase !== 'idle' || disabled) return;
    setPhase('busy');
    try {
      // A short minimum, so the button visibly becomes the bag before it flies.
      await Promise.all([onAdd(), wait(320)]);
    } catch {
      if (live.current) setPhase('idle');
      return;
    }
    const flight = flyToBag(ref.current);
    if (!live.current) return;
    setPhase('done');
    await flight;
    onLanded?.();
    await wait(1400);
    if (live.current) setPhase('idle');
  };

  const h = size === 'lg' ? 'h-13' : 'h-11';
  const colours =
    tone === 'buy'
      ? 'bg-vermilion text-paper hover:bg-[#A91D25] disabled:bg-stone disabled:text-graphite'
      : 'bg-obsidian text-paper hover:bg-[#2A2E31] disabled:bg-stone disabled:text-graphite';

  return (
    <div className={cx('flex justify-center', className)}>
      <button
        ref={ref}
        type="button"
        onClick={() => void press()}
        disabled={disabled}
        aria-busy={phase === 'busy' || undefined}
        aria-label={phase === 'idle' ? srLabel : undefined}
        aria-describedby={describedBy}
        data-phase={phase}
        className={cx(
          'relative inline-flex items-center justify-center gap-2 overflow-hidden font-semibold transition-[width,border-radius,background-color] duration-300 ease-[cubic-bezier(0.65,0,0.35,1)] active:scale-[0.985] disabled:cursor-not-allowed',
          h,
          size === 'lg' ? 'text-base' : 'text-[15px]',
          colours,
          phase === 'busy' ? (size === 'lg' ? 'w-13 rounded-full' : 'w-11 rounded-full') : 'w-full rounded-[8px]',
          phase === 'done' && 'bg-success hover:bg-success',
        )}
      >
        {phase === 'busy' ? (
          <>
            <ShoppingBag className="size-5 animate-pulse" aria-hidden />
            <span className="sr-only">{label}</span>
          </>
        ) : phase === 'done' ? (
          <>
            <svg viewBox="0 0 24 24" className="tick-draw size-5" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
            <span className="animate-fade">{t('product.addedShort')}</span>
          </>
        ) : (
          <>
            <ShoppingBag className="size-[18px]" aria-hidden />
            <span className="animate-fade">{label}</span>
          </>
        )}
      </button>
    </div>
  );
}

/** The alert after adding: the item, its size, and the two next steps. */
export function useAddedAlert() {
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  return {
    added({ name, size, image }: { name: string; size: string; image?: string | null }) {
      toast.show({
        tone: 'success',
        title: t('product.added'),
        body: t('bag.addedBody', { name, size }),
        image,
        actions: [
          { label: t('bag.view'), onClick: openBag },
          { label: t('bag.checkout'), onClick: () => void navigate('/checkout'), primary: true },
        ],
      });
    },
    failed(e: unknown) {
      toast.error(isApiError(e) ? e.message : t('common.error'));
    },
  };
}
