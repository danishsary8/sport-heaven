import { useSearchParams } from 'react-router';
import { useI18n } from '../../../lib/i18n';
import { cx } from '../../../ui';
import type { Facet } from '../api';
import { MULTI_KEYS, setPrice, toggleValue } from './params';

const isMulti = (key: string) => (MULTI_KEYS as readonly string[]).includes(key) || key === 'inStockOnly';

/** One group per facet the API returns; ticking applies at once and is kept in the URL. */
export function FilterPanel({ facets, hidden = [] }: { facets: Facet[]; hidden?: string[] }) {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const apply = (next: URLSearchParams) => setParams(next, { preventScrollReset: true });

  return (
    <div className="flex flex-col divide-y divide-stone">
      {facets
        .filter((f) => !hidden.includes(f.key))
        .map((facet) => {
          if (facet.type === 'range') {
            const range = facet.range;
            if (!range) return null;
            const selMin = Number(params.get('priceMin') ?? 0) || 0;
            const selMax = params.get('priceMax');
            const anyPrice = !params.get('priceMin') && !selMax;
            return (
              <fieldset key={facet.key} className="py-4">
                <legend className="mb-2 text-sm font-semibold">{facet.label}</legend>
                <div className="flex flex-col gap-1">
                  <Choice type="radio" name="price" label={t('listing.anyPrice')} checked={anyPrice} onChange={() => apply(setPrice(params, null, null))} />
                  {range.buckets.map((b) => (
                    <Choice
                      key={b.label}
                      type="radio"
                      name="price"
                      label={b.label}
                      count={b.count}
                      checked={!anyPrice && selMin === b.min && (selMax == null ? b.max == null : Number(selMax) === b.max)}
                      onChange={() => apply(setPrice(params, b.min, b.max ?? null))}
                    />
                  ))}
                </div>
              </fieldset>
            );
          }
          const options = facet.options ?? [];
          if (options.length === 0) return null;
          const multi = isMulti(facet.key);
          const selected = params.getAll(facet.key);
          return (
            <fieldset key={facet.key} className="py-4">
              <legend className="mb-2 text-sm font-semibold">{facet.label}</legend>
              <div className={cx('flex', facet.key === 'size' ? 'flex-wrap gap-1.5' : 'flex-col gap-1')}>
                {options.map((o) =>
                  facet.key === 'size' ? (
                    <label
                      key={o.value}
                      className={cx(
                        'relative inline-flex h-9 min-w-12 cursor-pointer items-center justify-center rounded-[6px] border px-2 text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-obsidian',
                        selected.includes(o.value) ? 'border-obsidian bg-obsidian text-paper' : 'border-[#C9C5BB] hover:border-obsidian',
                        o.count === 0 && !selected.includes(o.value) && 'opacity-45',
                      )}
                    >
                      <input type="checkbox" className="sr-only" checked={selected.includes(o.value)} onChange={() => apply(toggleValue(params, facet.key, o.value, true))} />
                      {o.label}
                    </label>
                  ) : (
                    <Choice
                      key={o.value}
                      type={multi ? 'checkbox' : 'radio'}
                      name={facet.key}
                      label={o.label}
                      count={o.count}
                      checked={selected.includes(o.value)}
                      onChange={() => apply(toggleValue(params, facet.key, o.value, multi))}
                    />
                  ),
                )}
              </div>
            </fieldset>
          );
        })}
    </div>
  );
}

function Choice({ type, name, label, count, checked, onChange }: { type: 'checkbox' | 'radio'; name: string; label: string; count?: number; checked: boolean; onChange(): void }) {
  return (
    <label className={cx('flex min-h-9 cursor-pointer items-center gap-2.5 text-[15px]', count === 0 && !checked && 'text-graphite')}>
      <input type={type} name={name} checked={checked} onChange={onChange} onClick={type === 'radio' && checked ? onChange : undefined} className="size-[18px] accent-obsidian" />
      <span className="flex-1">{label}</span>
      {count != null && <span className="tabular text-sm text-graphite">{count}</span>}
    </label>
  );
}
