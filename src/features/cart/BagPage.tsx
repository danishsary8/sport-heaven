import { Link } from 'react-router';
import { useI18n } from '../../lib/i18n';
import { EmptyState, PageTitle, QueryView, Seo, Skeleton } from '../../ui';
import { useCart } from './api';
import { BagLines, BagTotals, CheckoutButton, PromoField } from './BagContents';
import { DeliveryEstimate } from './DeliveryEstimate';

export function EmptyBag() {
  const { t } = useI18n();
  return (
    <EmptyState
      title={t('bag.empty')}
      body={t('bag.emptyBody')}
      action={
        <Link to="/shop" className="inline-flex h-11 items-center rounded-[6px] bg-obsidian px-5 font-semibold text-paper">
          {t('bag.startShopping')}
        </Link>
      }
    />
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
            <aside aria-label={t('bag.summary')} className="flex h-fit flex-col gap-5 rounded-[8px] border border-stone p-5 lg:sticky lg:top-24">
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
