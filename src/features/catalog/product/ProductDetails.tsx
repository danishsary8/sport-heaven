import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useI18n } from '../../../lib/i18n';
import type { ProductDetail } from '../api';
import { humaniseKey } from './specs';

/** About, details and delivery as accordions (About open), like the big sports shops lay them out. */
export function ProductDetails({ product }: { product: ProductDetail }) {
  const { t } = useI18n();
  const specs = Object.entries((product.specs ?? {}) as Record<string, unknown>).filter(([, v]) => typeof v === 'string' || typeof v === 'number');
  const hasAbout = Boolean(product.description) || (product.highlights?.length ?? 0) > 0;
  return (
    <div className="mt-8 border-t border-stone">
      {hasAbout && (
        <Section title={t('product.about')} open>
          {product.description && <p className="max-w-[62ch] text-[15px] leading-relaxed text-obsidian/90">{product.description}</p>}
          {product.highlights && product.highlights.length > 0 && (
            <ul className="mt-3 flex list-disc flex-col gap-1 pl-5 text-[15px] marker:text-graphite">
              {product.highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          )}
        </Section>
      )}
      {specs.length > 0 && (
        <Section title={t('product.specs')}>
          <dl className="divide-y divide-stone text-[15px]">
            {specs.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 py-2.5">
                <dt className="text-graphite">{humaniseKey(k)}</dt>
                <dd>{String(v)}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}
      <Section title={t('product.deliveryReturns')}>
        <p className="text-[15px] text-obsidian/90">{t('product.pickupNote')}</p>
        <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[15px] font-semibold">
          <Link to="/help/delivery" className="underline underline-offset-4 hover:no-underline">
            {t('footer.delivery')}
          </Link>
          <Link to="/help/returns" className="underline underline-offset-4 hover:no-underline">
            {t('footer.returns')}
          </Link>
        </p>
      </Section>
    </div>
  );
}

function Section({ title, open = false, children }: { title: string; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className="group border-b border-stone">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 [&::-webkit-details-marker]:hidden">
        <h2 className="font-display text-2xl font-bold leading-none">{title}</h2>
        <ChevronDown className="size-5 shrink-0 text-graphite transition-transform duration-200 group-open:rotate-180" aria-hidden />
      </summary>
      <div className="pb-5">{children}</div>
    </details>
  );
}
