import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useI18n } from '../../lib/i18n';
import { Picture, Sheet, Skeleton, cx } from '../../ui';
import { useFilters, useMenu } from '../catalog/api';
import { buildMegaMenu } from './megaMenu';
import { LangSwitch } from './LangSwitch';

export function MobileMenu({ open, onClose }: { open: boolean; onClose(): void }) {
  const { t } = useI18n();
  const menu = useMenu();
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const link = 'block py-2.5 text-[17px] font-medium';
  return (
    <Sheet open={open} onClose={onClose} side="left" title={t('nav.menu')}>
      <nav aria-label={t('nav.categories')} className="flex flex-col gap-6" onClick={(e) => (e.target as HTMLElement).closest('a') && onClose()}>
        <ul className="divide-y divide-stone">
          {(menu.data?.categories ?? []).map((c) => {
            const expanded = openSlug === c.slug;
            return (
              <li key={c.slug}>
                <div className="flex items-center justify-between">
                  <Link to={`/c/${c.slug}`} className="flex-1 py-3 font-display text-2xl font-bold">
                    {c.name}
                  </Link>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={`m-sub-${c.slug}`}
                    aria-label={t('mega.open', { name: c.name })}
                    onClick={() => setOpenSlug(expanded ? null : c.slug)}
                    className="grid size-11 place-items-center rounded-full hover:bg-stone"
                  >
                    <ChevronDown className={cx('size-5 transition-transform', expanded && 'rotate-180')} aria-hidden />
                  </button>
                </div>
                {expanded && <MobileSubmenu id={`m-sub-${c.slug}`} category={c.slug} />}
              </li>
            );
          })}
          <li>
            <Link to="/shop" className="flex py-3 font-display text-2xl font-bold">
              {t('nav.shopAll')}
            </Link>
          </li>
        </ul>
        {menu.data && menu.data.brands.length > 0 && (
          <div>
            <h3 className="mb-1 text-sm font-semibold text-graphite">{t('nav.brands')}</h3>
            <ul className="flex flex-wrap gap-x-4">
              {menu.data.brands.map((b) => (
                <li key={b.slug}>
                  <Link to={`/brands/${b.slug}`} className={link}>
                    {b.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        <ul>
          <li>
            <Link to="/stores" className={link}>
              {t('nav.stores')}
            </Link>
          </li>
          <li>
            <Link to="/track" className={link}>
              {t('nav.track')}
            </Link>
          </li>
          <li>
            <Link to="/help" className={link}>
              {t('nav.help')}
            </Link>
          </li>
        </ul>
      </nav>
      <div className="mt-6 border-t border-stone pt-5">
        <LangSwitch />
      </div>
    </Sheet>
  );
}

/** A category's sub-categories inside the phone menu: the same tiles (swipe sideways) and links as the desktop menu. */
function MobileSubmenu({ id, category }: { id: string; category: string }) {
  const { t, lang } = useI18n();
  const menu = useMenu();
  const filters = useFilters({ category });
  if (!filters.data || filters.isPlaceholderData) return <Skeleton className="mb-4 h-24 w-full" />;
  const data = buildMegaMenu(category, filters.data.facets, menu.data?.collections ?? [], t, lang);
  return (
    <div id={id} className="animate-fade flex flex-col gap-5 pb-5">
      <p className="-mt-1 text-sm text-graphite">{data.intro}</p>
      {data.tiles.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-graphite">{t(data.tilesTitle)}</h3>
          <ul className="-mx-5 mt-2 flex snap-x scroll-px-5 gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
            {data.tiles.map((tile) => (
              <li key={tile.href} className="w-[112px] shrink-0 snap-start">
                <Link to={tile.href} className="flex flex-col">
                  <span className="stage relative block aspect-square overflow-hidden rounded-[10px]">
                    {tile.image ? (
                      <Picture src={tile.image} alt="" sizes="112px" width={224} height={224} className="absolute inset-0" />
                    ) : (
                      <span aria-hidden className="absolute inset-0 grid place-items-center p-2 text-center font-display text-xl font-bold leading-none text-obsidian/80">
                        {tile.label}
                      </span>
                    )}
                  </span>
                  <span className="mt-1.5 text-[13px] font-semibold leading-tight">{tile.label}</span>
                  {tile.note && <span className="mt-0.5 line-clamp-2 text-xs leading-snug text-graphite">{tile.note}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.columns.map((col) => (
        <div key={col.title}>
          <h3 className="text-sm font-semibold text-graphite">{t(col.title)}</h3>
          <ul className="mt-1 flex flex-wrap gap-2 pt-1">
            {col.links.map((l) => (
              <li key={l.href}>
                <Link to={l.href} className="inline-flex h-10 items-center rounded-full border border-[#C9C5BB] px-4 text-[15px] font-medium">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
