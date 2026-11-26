import { formatDate, formatUsd, useI18n, type DictKey } from '../../../lib/i18n';
import { PageTitle, QueryView, Seo, Skeleton, cx } from '../../../ui';
import { useLoyalty, type Loyalty } from '../api';

const fmt = new Intl.NumberFormat('en-US');

export function TierCard({ loyalty, compact = false }: { loyalty: Loyalty; compact?: boolean }) {
  const { t } = useI18n();
  const tier = t(`tier.${loyalty.tier}` as DictKey);
  const next = loyalty.nextTier;
  const progress = next ? Math.min(100, Math.round((loyalty.lifetimeSpendCents / next.minSpendCents) * 100)) : 100;
  return (
    <section aria-label={t('acc.nav.points')} className="rounded-[10px] bg-obsidian p-5 text-paper">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="font-display text-2xl font-bold text-brass">{t('acc.tierMember', { tier })}</p>
        <p className="tabular font-display text-4xl font-bold">{t('acc.points', { n: fmt.format(loyalty.pointsBalance) })}</p>
      </div>
      {next ? (
        <>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-paper/15" aria-hidden>
            <div className="h-full rounded-full bg-brass" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-sm text-paper/85">{t('acc.nextTier', { amount: formatUsd(next.remainingCents), tier: t(`tier.${next.id}` as DictKey) })}</p>
        </>
      ) : (
        <p className="mt-2 text-sm text-paper/85">{t('acc.topTier')}</p>
      )}
      {!compact && (
        <ul className="mt-4 flex flex-col gap-1 text-sm text-paper/90">
          {loyalty.perks.memberDiscountPercent ? <li>{t('acc.perk.discount', { n: loyalty.perks.memberDiscountPercent })}</li> : null}
          {loyalty.perks.freeDelivery?.length ? <li>{t('acc.perk.delivery')}</li> : null}
          {loyalty.perks.freePrinting ? <li>{t('acc.perk.printing')}</li> : null}
          <li>{t('acc.perk.earn', { n: loyalty.pointsPerUsd })}</li>
        </ul>
      )}
    </section>
  );
}

export function PointsPage() {
  const { t, lang } = useI18n();
  const loyalty = useLoyalty();
  return (
    <div className="flex flex-col gap-6">
      <Seo title={t('acc.nav.points')} noindex />
      <PageTitle>{t('acc.nav.points')}</PageTitle>
      <QueryView query={loyalty} skeleton={<Skeleton className="h-40 w-full" />}>
        {(l) => (
          <>
            <TierCard loyalty={l} />
            {!l.phoneVerified && <p className="text-graphite">{t('acc.addPhone')}</p>}
            <section aria-labelledby="history">
              <h2 id="history" className="mb-3 font-display text-3xl font-bold">
                {t('acc.history')}
              </h2>
              {l.ledger.length === 0 ? (
                <p className="text-graphite">{t('acc.noHistory')}</p>
              ) : (
                <ul className="divide-y divide-stone">
                  {l.ledger.map((e, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 py-3">
                      <span>
                        <span className="block">{e.orderNumber ? t('acc.ledgerOrder', { number: e.orderNumber }) : (e.note ?? t('acc.ledgerAdjust'))}</span>
                        <span className="block text-sm text-graphite">{formatDate(e.createdAt, lang)}</span>
                      </span>
                      <span className={cx('tabular font-semibold', e.delta < 0 ? 'text-graphite' : 'text-brass')}>{e.delta > 0 ? `+${fmt.format(e.delta)}` : fmt.format(e.delta)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </QueryView>
    </div>
  );
}
