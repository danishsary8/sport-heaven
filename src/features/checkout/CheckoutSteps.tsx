import { Check } from 'lucide-react';
import { useI18n, type DictKey } from '../../lib/i18n';
import { cx } from '../../ui';

const STEPS: DictKey[] = ['steps.bag', 'steps.details', 'steps.payment', 'steps.done'];

/**
 * Where the shopper is in buying: bag, details, payment, done. Finished steps show a tick; the current one
 * is filled. `current` is the index of the step in progress (4 means all done).
 */
export function CheckoutSteps({ current, className }: { current: number; className?: string }) {
  const { t } = useI18n();
  return (
    <ol aria-label={t('steps.label')} className={cx('flex items-center', className)}>
      {STEPS.map((key, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <li key={key} aria-current={now ? 'step' : undefined} className="flex items-center">
            {i > 0 && <span aria-hidden className={cx('mx-2 h-[2px] w-5 rounded-full sm:mx-3 sm:w-10', done || now ? 'bg-obsidian' : 'bg-[#DEDAD0]')} />}
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className={cx(
                  'grid size-6 shrink-0 place-items-center rounded-full text-[12px] font-bold transition-colors',
                  done ? 'bg-obsidian text-paper' : now ? 'bg-vermilion text-paper ring-4 ring-vermilion/15' : 'border border-[#C9C5BB] text-graphite',
                )}
              >
                {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <span className={cx('text-[13px] font-semibold', now ? 'text-obsidian' : done ? 'text-obsidian/80' : 'text-graphite', !now && 'hidden md:inline')}>
                {t(key)}
                {done && <span className="sr-only"> ({t('steps.finished')})</span>}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
