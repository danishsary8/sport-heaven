import { useI18n } from '../../../lib/i18n';
import type { ProductDetail } from '../api';

/** "careGuide" → "Care guide". The API's spec keys are English; Khmer pages show them in English (OWNER-TODO). */
export function humaniseKey(key: string): string {
  const words = key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function ProductDetails({ product }: { product: ProductDetail }) {
  const { t } = useI18n();
  const specs = Object.entries((product.specs ?? {}) as Record<string, unknown>).filter(([, v]) => typeof v === 'string' || typeof v === 'number');
  return (
    <div className="mt-10 flex flex-col gap-7">
      {product.description && (
        <section>
          <h2 className="font-display text-2xl font-bold leading-none">{t('product.about')}</h2>
          <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-obsidian/90">{product.description}</p>
        </section>
      )}
      {product.highlights && product.highlights.length > 0 && (
        <ul className="-mt-2 flex list-disc flex-col gap-1 pl-5 text-[15px] marker:text-graphite">
          {product.highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      )}
      {specs.length > 0 && (
        <section>
          <h2 className="font-display text-2xl font-bold leading-none">{t('product.specs')}</h2>
          <dl className="mt-3 divide-y divide-stone border-y border-stone text-[15px]">
            {specs.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 py-2.5">
                <dt className="text-graphite">{humaniseKey(k)}</dt>
                <dd>{String(v)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
