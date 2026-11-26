import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { useAuth } from '../../../lib/auth';
import { formatDate, formatUsd, useI18n } from '../../../lib/i18n';
import { Seo, Skeleton } from '../../../ui';
import { StatusBadge } from '../../orders/OrderParts';
import { ACCOUNT_LINKS, useSignOutHome } from '../AccountLayout';
import { useLoyalty, useMyOrders } from '../api';
import { TierCard } from './PointsPage';

export function OverviewPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const loyalty = useLoyalty();
  const orders = useMyOrders();
  const signOut = useSignOutHome();
  const first = (user?.fullName ?? '').trim().split(/\s+/)[0];
  return (
    <div className="flex flex-col gap-8">
      <Seo title={t('acc.title')} noindex />
      <h1 className="font-display text-5xl font-bold">{first ? t('acc.hello', { name: first }) : t('acc.title')}</h1>
      {!user?.phoneVerified && (
        <p className="rounded-[8px] border border-brass/50 bg-brass/10 px-4 py-3">
          {t('acc.addPhone')}{' '}
          <Link to="/account/profile" className="font-semibold underline underline-offset-4">
            {t('acc.addPhoneLink')}
          </Link>
        </p>
      )}
      {loyalty.data ? <TierCard loyalty={loyalty.data} compact /> : <Skeleton className="h-32 w-full" />}
      <section aria-labelledby="recent">
        <div className="mb-3 flex items-end justify-between">
          <h2 id="recent" className="font-display text-3xl font-bold">
            {t('acc.recentOrders')}
          </h2>
          <Link to="/account/orders" className="font-semibold underline underline-offset-4">
            {t('home.seeAll')}
          </Link>
        </div>
        {orders.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : orders.data?.orders.length ? (
          <ul className="divide-y divide-stone rounded-[8px] border border-stone">
            {orders.data.orders.slice(0, 3).map((o) => (
              <li key={o.number}>
                <Link to={`/account/orders/${o.number}`} className="flex items-center gap-3 p-4 hover:bg-chalk">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{o.number}</span>
                    <span className="block text-sm text-graphite">
                      {formatDate(o.createdAt, lang)}, {formatUsd(o.totalCents)}
                    </span>
                  </span>
                  <StatusBadge status={o.status} />
                  <ChevronRight className="size-4 text-graphite" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-graphite">{t('acc.noOrders')}</p>
        )}
      </section>
      <nav aria-label={t('acc.nav')} className="lg:hidden">
        <ul className="divide-y divide-stone border-y border-stone">
          {ACCOUNT_LINKS.slice(1).map(([to, key]) => (
            <li key={to}>
              <Link to={to} className="flex items-center justify-between py-3.5 text-[17px] font-medium">
                {t(key)}
                <ChevronRight className="size-4 text-graphite" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => void signOut()} className="mt-4 font-semibold text-graphite underline underline-offset-4">
          {t('acc.signOut')}
        </button>
      </nav>
    </div>
  );
}
