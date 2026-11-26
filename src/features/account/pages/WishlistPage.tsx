import { X } from 'lucide-react';
import { Link } from 'react-router';
import { useI18n } from '../../../lib/i18n';
import { EmptyState, PageTitle, QueryView, Seo } from '../../../ui';
import { GridSkeleton } from '../../catalog/listing/ListingView';
import { ProductCard } from '../../catalog/ProductCard';
import { useToggleWishlist, useWishlist } from '../../catalog/product/wishlist';

export function WishlistPage() {
  const { t } = useI18n();
  const list = useWishlist();
  const toggle = useToggleWishlist();
  return (
    <div className="flex flex-col gap-6">
      <Seo title={t('acc.nav.wishlist')} noindex />
      <PageTitle>{t('acc.nav.wishlist')}</PageTitle>
      <QueryView
        query={list}
        skeleton={<GridSkeleton n={3} />}
        isEmpty={(d) => d.products.length === 0}
        empty={<EmptyState title={t('acc.wishlistEmpty')} body={t('acc.wishlistEmptyBody')} action={<Link to="/shop" className="font-semibold underline underline-offset-4">{t('listing.shopAll')}</Link>} />}
      >
        {(d) => (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3">
            {d.products.map((p) => (
              <li key={p.slug} className="relative">
                <ProductCard product={p} />
                <button
                  type="button"
                  aria-label={t('acc.wishlistRemove', { name: p.name })}
                  onClick={() => toggle.mutate({ slug: p.slug, on: false })}
                  className="absolute right-2 top-2 z-10 grid size-9 place-items-center rounded-full bg-paper/90 hover:bg-paper"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </QueryView>
    </div>
  );
}
