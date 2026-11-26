import { Link, Navigate } from 'react-router';
import { useI18n } from '../../lib/i18n';
import { Seo } from '../../ui';
import { readCardReturn } from '../checkout/orderAccess';

/**
 * Where PayWay sends card payers back (PAYWAY_CONTINUE_URL). The pay page for the order checks the payment and
 * moves on to the confirmation once it is paid.
 */
export function CardReturnPage() {
  const { t } = useI18n();
  const number = readCardReturn();
  if (number) return <Navigate to={`/pay/${encodeURIComponent(number)}`} replace />;
  return (
    <section className="mx-auto max-w-[560px] px-4 py-16">
      <Seo title={t('pay.returnTitle')} noindex />
      <h1 className="font-display text-4xl font-bold leading-none">{t('pay.returnTitle')}</h1>
      <p className="mt-3 text-graphite">{t('pay.returnBody')}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/track" className="inline-flex h-12 items-center rounded-[6px] bg-obsidian px-5 font-semibold text-paper">
          {t('pay.returnTrack')}
        </Link>
        <Link to="/account/orders" className="inline-flex h-12 items-center rounded-[6px] border border-obsidian px-5 font-semibold">
          {t('pay.returnOrders')}
        </Link>
      </div>
    </section>
  );
}
