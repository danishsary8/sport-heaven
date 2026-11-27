import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { useI18n } from '../../lib/i18n';
import { Picture, cx } from '../../ui';
import { useFilters, useMenu } from '../catalog/api';
import { buildMegaMenu, type MenuTile } from './megaMenu';

/**
 * The panel under the header for one category. Left: "Shop all", a line on how the category is organised,
 * and photo tiles for the first choice a shopper makes (pitch, league, team, item). Right: the other ways in
 * (national teams, kit, collections, brands). Filters are fetched when the panel first opens.
 */
export function MegaMenuPanel({ id, category, name, onNavigate }: { id: string; category: string; name: string; onNavigate(): void }) {
  const { t, lang } = useI18n();
  const menu = useMenu();
  const filters = useFilters({ category });
  // The query keeps the previous category's data while loading: treat that as loading, not as this category.
  const data = filters.data && !filters.isPlaceholderData ? buildMegaMenu(category, filters.data.facets, menu.data?.collections ?? [], t, lang) : null;
  const all = `/c/${encodeURIComponent(category)}`;
  // Collections sit as pills under the tiles; the other groups make the columns on the right.
  const featured = data?.columns.find((c) => c.title === 'mega.collections');
  const columns = data?.columns.filter((c) => c !== featured) ?? [];
  const total = menu.data?.categories.find((c) => c.slug === category)?.productCount;

  return (
    <div id={id} className="animate-mega absolute inset-x-0 top-full border-t border-stone bg-paper shadow-[0_30px_50px_-30px_rgb(14_17_19/0.4)]">
      <div className="mx-auto max-w-[1320px] px-8 pb-8 pt-7">
        <div className="flex items-end justify-between gap-8">
          <div>
            <Link to={all} onClick={onNavigate} className="group inline-flex items-center gap-2.5 font-display text-[34px] font-bold leading-none">
              <span className="underline-offset-4 group-hover:underline">{t('mega.shopAll', { name })}</span>
              <span className="grid size-8 place-items-center rounded-full bg-obsidian text-paper transition-transform group-hover:translate-x-1">
                <ArrowRight className="size-4" aria-hidden />
              </span>
            </Link>
            {data && <p className="mt-2 text-[15px] text-graphite">{data.intro}</p>}
          </div>
          {total ? <p className="tabular shrink-0 pb-1 text-sm text-graphite">{t('mega.total', { n: total })}</p> : null}
        </div>

        {data === null ? (
          <div className="mt-7 grid grid-cols-[minmax(0,1fr)_420px] gap-10" aria-hidden>
            <div className="grid grid-cols-6 gap-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="skeleton aspect-square rounded-[10px]" />
                  <div className="skeleton h-3.5 w-3/4 rounded" />
                  <div className="skeleton h-3 w-full rounded" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-6">
              {[0, 1].map((i) => (
                <div key={i} className="flex flex-col gap-2.5">
                  <div className="skeleton h-4 w-24 rounded" />
                  {[0, 1, 2, 3].map((j) => (
                    <div key={j} className="skeleton h-3.5 w-32 rounded" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={cx('mt-7 grid gap-10', columns.length ? (columns.length === 3 ? 'grid-cols-[minmax(0,1fr)_minmax(320px,500px)]' : 'grid-cols-[minmax(0,1fr)_minmax(280px,400px)]') : 'grid-cols-1')}>
            <div className="flex flex-col gap-7">
            {data.tiles.length > 0 && (
              <section aria-labelledby={`${id}-tiles`}>
                <h3 id={`${id}-tiles`} className="mb-3 text-sm font-semibold text-graphite">
                  {t(data.tilesTitle)}
                </h3>
                {/* At least four slots, so three tiles stay tile-sized instead of stretching across the panel. */}
                <ul className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(Math.max(data.tiles.length, 4), 6)}, minmax(0, 1fr))` }}>
                  {data.tiles.map((tile) => (
                    <li key={tile.href}>
                      <Tile tile={tile} onNavigate={onNavigate} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {featured && (
              <section aria-labelledby={`${id}-featured`} className="flex flex-wrap items-center gap-2">
                <h3 id={`${id}-featured`} className="mr-2 text-sm font-semibold text-graphite">
                  {t(featured.title)}
                </h3>
                {featured.links.map((l) => (
                  <Link key={l.href} to={l.href} onClick={onNavigate} className="inline-flex h-9 items-center rounded-full border border-[#D6D2C8] px-4 text-sm font-medium transition-colors hover:border-obsidian hover:bg-obsidian hover:text-paper">
                    {l.label}
                  </Link>
                ))}
              </section>
            )}
            </div>
            {columns.length > 0 && (
              <div className={cx('grid content-start gap-x-8 gap-y-7 border-l border-stone pl-10', columns.length === 3 ? 'grid-cols-3' : columns.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
                {columns.map((col) => (
                  <section key={col.title} aria-labelledby={`${id}-${col.title}`}>
                    <h3 id={`${id}-${col.title}`} className="text-sm font-semibold text-graphite">
                      {t(col.title)}
                    </h3>
                    <ul className="mt-2.5 flex flex-col gap-1.5">
                      {col.links.map((l) => (
                        <li key={l.href}>
                          <Link to={l.href} onClick={onNavigate} className="group flex items-baseline gap-2 text-[15px] leading-snug">
                            <span className="underline-offset-4 group-hover:underline">{l.label}</span>
                            {l.count != null && <span className="tabular text-xs text-graphite">{l.count}</span>}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** A sub-category as a photo card: the product on its stage, the name, and what it means in plain words. */
function Tile({ tile, onNavigate }: { tile: MenuTile; onNavigate(): void }) {
  return (
    <Link to={tile.href} onClick={onNavigate} className="group flex h-full flex-col">
      <span className="stage relative block aspect-square overflow-hidden rounded-[10px] shadow-[inset_0_0_0_1px_rgb(14_17_19/0.04)] transition-shadow group-hover:shadow-[inset_0_0_0_2px_#0E1113]">
        {tile.image ? (
          <Picture src={tile.image} alt="" sizes="140px" width={280} height={280} className="absolute inset-0" imgClassName="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.07]" />
        ) : (
          <span aria-hidden className="absolute inset-0 grid place-items-center p-3 text-center font-display text-[26px] font-bold leading-[0.95] text-obsidian/80">
            {tile.label}
          </span>
        )}
        {tile.count != null && (
          <span className="tabular absolute right-1.5 top-1.5 rounded-full bg-paper/90 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-graphite backdrop-blur">{tile.count}</span>
        )}
      </span>
      <span className="mt-2 text-[14px] font-semibold leading-tight underline-offset-4 group-hover:underline">{tile.label}</span>
      {tile.note && <span className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-graphite">{tile.note}</span>}
    </Link>
  );
}
