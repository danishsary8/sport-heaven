import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { useI18n } from '../../../lib/i18n';
import { cx } from '../../../ui';

/**
 * A round back button over the photo, for phones. Goes back to the page the shopper came from (the listing keeps
 * its filters and scroll); opened from a shared link, it goes to the product's category instead of leaving the shop.
 */
export function BackButton({ fallback, className }: { fallback: string; className?: string }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  // The first page of a visit has the key "default": there is no shop page to go back to.
  const hasHistory = location.key !== 'default';
  return (
    <button
      type="button"
      aria-label={t('product.back')}
      onClick={() => (hasHistory ? navigate(-1) : navigate(fallback))}
      className={cx(
        'grid size-11 place-items-center rounded-full bg-paper/85 text-obsidian shadow-[0_6px_18px_-6px_rgb(14_17_19/0.35)] ring-1 ring-obsidian/5 backdrop-blur-md transition-[transform,background-color] active:scale-95 hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-obsidian',
        className,
      )}
    >
      <ArrowLeft className="size-5" strokeWidth={2.25} aria-hidden />
    </button>
  );
}
