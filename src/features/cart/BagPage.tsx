import { Link } from 'react-router';
import { useI18n } from '../../lib/i18n';
import { EmptyState, PageTitle, PaymentMarks, QueryView, Seo, Skeleton } from '../../ui';
import { ShieldCheck } from 'lucide-react';
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
    <section className="mx-auto max-w-[1180px] px-4 pb-16 pt-6 lg:px-8 lg:pt-10">
      <Seo title={t('bag.title')} noindex />
      <div className="flex items-baseline gap-4">
        <PageTitle size="page">{t('bag.title')}</PageTitle>
        {cart.data && cart.data.cart.lines.length > 0 && <span className="text-graphite">{t('co.itemCount', { n: cart.data.cart.lines.reduce((n, l) => n + l.qty, 0) })}</span>}
      </div>
      <QueryView query={cart} skeleton={<Skeleton className="mt-6 h-64 w-full" />} isEmpty={(d) => d.cart.lines.length === 0} empty={<EmptyBag />}>
        {({ cart: c }) => (
          <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12">
            <div className="min-w-0">
              <div className="rounded-[16px] border border-stone px-4 sm:px-5">
                <BagLines cart={c} />
              </div>
              {c.notices.map((n) => (
                <p key={n} className="mt-3 rounded-[10px] bg-stone/70 px-4 py-2.5 text-sm">
                  {n}
                </p>
              ))}
            </div>
            <aside aria-label={t('bag.summary')} className="h-fit lg:sticky lg:top-24">
              <div className="receipt flex flex-col gap-5 rounded-t-[16px] bg-chalk p-5 shadow-[inset_0_0_0_1px_#EAE7DF] lg:p-6">
                <h2 className="font-display text-[28px] font-bold leading-none">{t('bag.summary')}</h2>
                <BagTotals cart={c} />
                <CheckoutButton cart={c} />
                <div className="flex items-center justify-between gap-3 text-[13px] text-graphite">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="size-4" aria-hidden />
                    {t('bag.weAccept')}
                  </span>
                  <PaymentMarks kinds={['khqr', 'visa', 'mastercard', 'cash']} />
                </div>
                <div className="border-t border-dashed border-[#C9C5BB] pt-5">
                  <PromoField cart={c} />
                </div>
                <DeliveryEstimate />
              </div>
            </aside>
          </div>
        )}
      </QueryView>
    </section>
  );
}
