import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { useI18n } from '../../lib/i18n';
import { Picture } from '../../ui';
import { useFilters, useMenu } from '../catalog/api';
import { CATEGORY_IMAGES } from '../catalog/categoryImages';
import { buildMegaMenu } from './megaMenu';

/**
 * The panel under the header for one category: its sub-categories in columns (from the API's facets
 * and collections), a photo tile and "Shop all". Filters are fetched when the panel first opens.
 */
export function MegaMenuPanel({ id, category, name, onNavigate }: { id: string; category: string; name: string; onNavigate(): void }) {
  const { t } = useI18n();
  const menu = useMenu();
  const filters = useFilters({ category });
  // The query keeps the previous category's data while loading: treat that as loading, not as this category.
  const columns = filters.data && !filters.isPlaceholderData ? buildMegaMenu(category, filters.data.facets, menu.data?.collections ?? [], t) : null;
  const image = CATEGORY_IMAGES[category];
  const all = `/c/${encodeURIComponent(category)}`;

  return (
    <div id={id} className="animate-mega absolute inset-x-0 top-full border-t border-stone bg-paper shadow-[0_24px_40px_-24px_rgb(14_17_19/0.35)]">
      <div className="mx-auto grid max-w-[1320px] grid-cols-[minmax(0,1fr)_280px] gap-10 px-8 py-8">
        <div>
          <Link to={all} onClick={onNavigate} className="group inline-flex items-center gap-2 font-display text-3xl font-bold leading-none hover:underline hover:underline-offset-4">
            {t('mega.shopAll', { name })}
            <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
          {columns === null ? (
            <div className="mt-6 grid grid-cols-4 gap-8" aria-hidden>
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex flex-col gap-2.5">
                  <div className="skeleton h-4 w-24 rounded" />
                  {[0, 1, 2, 3].map((j) => (
                    <div key={j} className="skeleton h-3.5 w-32 rounded" />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-4 gap-x-8 gap-y-6">
              {columns.map((col) => (
                <section key={col.title} aria-labelledby={`${id}-${col.title}`}>
                  <h3 id={`${id}-${col.title}`} className="text-sm font-semibold text-graphite">
                    {t(col.title)}
                  </h3>
                  <ul className="mt-3 flex flex-col gap-2">
                    {col.links.map((l) => (
                      <li key={l.href}>
                        <Link to={l.href} onClick={onNavigate} className="group flex items-baseline gap-2 text-[15px] hover:underline hover:underline-offset-4">
                          <span>{l.label}</span>
                          {l.count != null && <span className="tabular text-xs text-graphite group-hover:no-underline">{l.count}</span>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
        {image && (
          <Link to={all} onClick={onNavigate} tabIndex={-1} aria-hidden className="stage group relative block aspect-[4/5] overflow-hidden rounded-[8px]">
            <Picture src={image} alt="" sizes="280px" className="absolute inset-0" imgClassName="object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
          </Link>
        )}
      </div>
    </div>
  );
}
