import { Heart } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../../lib/auth';
import { useI18n } from '../../../lib/i18n';
import { cx } from '../../../ui';
import { useWishlist, useToggleWishlist } from './wishlist';

/** The heart. `card`: a small white button over a product photo; `page`: the outlined one by the product name. */
export function WishlistButton({ slug, name, variant = 'page' }: { slug: string; name?: string; variant?: 'page' | 'card' }) {
  const { t } = useI18n();
  const { status } = useAuth();
  const navigate = useNavigate();
  const list = useWishlist();
  const toggle = useToggleWishlist();
  const base =
    variant === 'card'
      ? 'grid size-9 shrink-0 place-items-center rounded-full bg-paper/90 text-obsidian shadow-[0_2px_10px_-4px_rgb(14_17_19/0.4)] backdrop-blur transition-transform hover:scale-105 hover:bg-paper'
      : 'grid size-11 shrink-0 place-items-center rounded-full border border-[#C9C5BB] hover:border-obsidian';
  const icon = variant === 'card' ? 'size-[18px]' : 'size-5';
  if (status !== 'member') {
    // On a card the heart is a button, so the product name stays the card's first link (keyboard order).
    if (variant === 'card')
      return (
        <button type="button" className={base} aria-label={t('wishlist.signIn')} onClick={() => void navigate('/sign-in', { state: { from: `/p/${slug}` } })}>
          <Heart className={icon} aria-hidden />
        </button>
      );
    return (
      <Link to="/sign-in" state={{ from: `/p/${slug}` }} className={base} aria-label={t('wishlist.signIn')}>
        <Heart className={icon} aria-hidden />
      </Link>
    );
  }
  const on = !!list.data?.products.some((p) => p.slug === slug);
  return (
    <button type="button" className={base} aria-pressed={on} aria-label={name ? `${t('wishlist.save')}: ${name}` : t('wishlist.save')} onClick={() => toggle.mutate({ slug, on: !on })}>
      <Heart className={cx(icon, on && 'fill-vermilion text-vermilion')} aria-hidden />
    </button>
  );
}
