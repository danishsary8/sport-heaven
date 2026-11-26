import { Heart } from 'lucide-react';
import { Link } from 'react-router';
import { useAuth } from '../../../lib/auth';
import { useI18n } from '../../../lib/i18n';
import { cx } from '../../../ui';
import { useWishlist, useToggleWishlist } from './wishlist';

export function WishlistButton({ slug }: { slug: string }) {
  const { t } = useI18n();
  const { status } = useAuth();
  const list = useWishlist();
  const toggle = useToggleWishlist();
  const base = 'grid size-11 shrink-0 place-items-center rounded-full border border-[#C9C5BB] hover:border-obsidian';
  if (status !== 'member') {
    return (
      <Link to="/sign-in" state={{ from: `/p/${slug}` }} className={base} aria-label={t('wishlist.signIn')}>
        <Heart className="size-5" aria-hidden />
      </Link>
    );
  }
  const on = !!list.data?.products.some((p) => p.slug === slug);
  return (
    <button type="button" className={base} aria-pressed={on} aria-label={t('wishlist.save')} onClick={() => toggle.mutate({ slug, on: !on })}>
      <Heart className={cx('size-5', on && 'fill-vermilion text-vermilion')} aria-hidden />
    </button>
  );
}
