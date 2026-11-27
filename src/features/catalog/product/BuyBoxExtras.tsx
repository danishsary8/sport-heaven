import { RotateCcw, Store, Truck } from 'lucide-react';
import { Link } from 'react-router';
import { useI18n, type DictKey } from '../../../lib/i18n';
import { cx } from '../../../ui';
import type { ProductDetail } from '../api';

/** Badges the API sets on the product (new, best seller, limited…), above the brand and name. */
export function ProductBadges({ product }: { product: Pick<ProductDetail, 'badges' | 'discountPct'> }) {
  const { t } = useI18n();
  const badges = (product.badges ?? []).filter((b) => b !== 'sale');
  if (!badges.length && !product.discountPct) return null;
  return (
    <ul className="mb-3 flex flex-wrap gap-1.5" aria-label={t('product.badges')}>
      {product.discountPct ? <li className="rounded-[4px] bg-vermilion px-2 py-1 text-xs font-semibold leading-none text-paper">{t('card.sale', { n: product.discountPct })}</li> : null}
      {badges.map((b) => (
        <li
          key={b}
          className={cx(
            'rounded-[4px] px-2 py-1 text-xs font-semibold leading-none',
            b === 'new' ? 'bg-obsidian text-paper' : b === 'limited' || b === 'signature' ? 'bg-stone text-obsidian' : 'bg-cobalt/10 text-cobalt',
          )}
        >
          {t(`badge.${b}` as DictKey)}
        </li>
      ))}
    </ul>
  );
}

const SERVICES: { icon: typeof Truck; title: DictKey; body: DictKey; to: string }[] = [
  { icon: Truck, title: 'product.svc.delivery', body: 'product.svc.deliveryBody', to: '/help/delivery' },
  { icon: Store, title: 'product.svc.pickup', body: 'product.svc.pickupBody', to: '/stores' },
  { icon: RotateCcw, title: 'product.svc.returns', body: 'product.svc.returnsBody', to: '/help/returns' },
];

/** Delivery, pickup and returns under Add to bag, each linking to the page that explains it. */
export function ServiceList() {
  const { t } = useI18n();
  return (
    <ul className="mt-5 divide-y divide-stone overflow-hidden rounded-[8px] border border-stone bg-chalk/60">
      {SERVICES.map(({ icon: Icon, title, body, to }) => (
        <li key={to}>
          <Link to={to} className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-chalk">
            <Icon className="mt-0.5 size-5 shrink-0 text-cobalt" aria-hidden />
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold group-hover:underline group-hover:underline-offset-4">{t(title)}</span>
              <span className="block text-sm text-graphite">{t(body)}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
