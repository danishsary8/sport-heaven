import { Link } from 'react-router';
import { useI18n } from '../../lib/i18n';
import { EmptyState, PageTitle, QueryView, Seo, Skeleton } from '../../ui';
import { useMenu } from '../catalog/api';
import { useCart } from './api';
import { BagLines, BagTotals, CheckoutButton, PromoField } from './BagContents';
import { DeliveryEstimate } from './DeliveryEstimate';

/**
 * The empty bag: a way back to the shop plus the categories from the menu, so the next step is one tap.
 * `onNavigate` lets the bag drawer close itself when a link is followed.
 */
export function EmptyBag({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const menu = useMenu();
  const categories = menu.data?.categories ?? [];
  return (
    <div className="flex flex-col items-start gap-6">
      <EmptyState
        className="pb-0"
        title={t('bag.empty')}
        body={t('bag.emptyBody')}
        action={
          <Link to="/shop" onClick={onNavigate} className="inline-flex h-11 items-center rounded-[6px] bg-obsidian px-5 font-semibold text-paper hover:bg-[#2A2E31]">
            {t('bag.startShopping')}
          </Link>
        }
      />
      {categories.length > 0 && (
        <nav aria-labelledby="bag-browse" className="w-full">
          <h3 id="bag-browse" className="text-sm font-semibold text-graphite">
            {t('bag.browse')}
          </h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link
                  to={`/c/${encodeURIComponent(c.slug)}`}
                  onClick={onNavigate}
                  className="inline-flex h-10 items-center rounded-full border border-[#C9C5BB] px-4 text-[15px] font-semibold transition-colors hover:border-obsidian"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}

export function BagPage() {
  const { t } = useI18n();
  const cart = useCart();
  return (
    <section className="mx-auto max-w-[1120px] px-4 pb-16 pt-6 lg:px-8 lg:pt-10">
      <Seo title={t('bag.title')} noindex />
      <PageTitle size="page">{t('bag.title')}</PageTitle>
      <QueryView query={cart} skeleton={<Skeleton className="mt-6 h-64 w-full" />} isEmpty={(d) => d.cart.lines.length === 0} empty={<EmptyBag />}>
        {({ cart: c }) => (
          <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0">
              <BagLines cart={c} />
              {c.notices.map((n) => (
                <p key={n} className="mt-3 rounded-[6px] bg-stone px-3 py-2 text-sm">
                  {n}
                </p>
              ))}
            </div>
            <aside aria-label={t('bag.summary')} className="flex h-fit flex-col gap-5 rounded-[8px] border border-stone bg-chalk p-5 lg:sticky lg:top-24 lg:p-6">
              <BagTotals cart={c} />
              <CheckoutButton cart={c} />
              <PromoField cart={c} />
              <DeliveryEstimate />
            </aside>
          </div>
        )}
      </QueryView>
    </section>
  );
}
