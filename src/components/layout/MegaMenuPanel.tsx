import { useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { MAIN_MENU, type MenuKey, type MenuLink } from '../../data/navigation';
import { applyShopQuery, CATEGORY_COLLECTION_SLUG, emptyShopQuery, parseShopParams } from '../../lib/shop-filters';
import { routeToHash } from '../../utils/router';
import { formatUsd } from '../../utils/commerce';

export type MegaMenuKey = MenuKey;

interface MegaMenuPanelProps {
  activeKey: MegaMenuKey;
  onClose: () => void;
}

export function menuLinkHref(link: MenuLink): string {
  return routeToHash({
    page: 'shop',
    collectionSlug: CATEGORY_COLLECTION_SLUG[link.category],
    ...(link.params ? { params: link.params } : {}),
  });
}

/** Desktop dropdown: link columns with live counts and one featured product. */
export function MegaMenuPanel({ activeKey, onClose }: MegaMenuPanelProps) {
  const { catalog, navigate, navigateToShop, getProductBySlug } = useStore();
  const section = MAIN_MENU.find((m) => m.key === activeKey)!;
  const featured = getProductBySlug(section.featuredSlug);

  const counts = useMemo(() => {
    const map = new Map<MenuLink, number>();
    for (const link of section.columns.flatMap((c) => c.links)) {
      map.set(link, applyShopQuery(catalog, parseShopParams(link.params ?? '', emptyShopQuery(link.category))).length);
    }
    return map;
  }, [catalog, section]);

  const follow = (e: React.MouseEvent, link: MenuLink) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    onClose();
    navigateToShop({ category: link.category, params: link.params });
  };

  return (
    <div
      role="region"
      aria-label={`${section.label} menu`}
      className="animate-mega-menu absolute inset-x-0 top-full z-40 border-b border-[#1B1E1B]/10 bg-[#FAF9F5] shadow-[0_24px_48px_rgba(27,30,27,0.08)]"
    >
      <div className="mx-auto grid max-w-[1440px] grid-cols-12 gap-10 px-6 py-8 lg:px-10">
        <div className="col-span-8 grid grid-cols-3 gap-8">
          {section.columns.map((column) => (
            <div key={column.title}>
              <h3 className="mb-2 text-sm font-semibold text-[#1B1E1B]">{column.title}</h3>
              <ul>
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={menuLinkHref(link)}
                      onClick={(e) => follow(e, link)}
                      className="flex min-h-10 items-center justify-between gap-3 rounded-md px-2 -mx-2 text-[15px] text-[#3A3E3A] hover:bg-[#1B1E1B]/[0.04] hover:text-[#1B1E1B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37B5C]"
                    >
                      <span>{link.label}</span>
                      <span className="text-xs tabular-nums text-[#5E625B]">{counts.get(link)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="col-span-3 -mt-2">
            <a
              href={menuLinkHref(section.all)}
              onClick={(e) => follow(e, section.all)}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-[#1B1E1B] underline decoration-[#A37B5C] decoration-2 underline-offset-4 hover:text-[#A37B5C]"
            >
              {section.all.label}
            </a>
          </div>
        </div>

        {featured && (
          <a
            href={routeToHash({ page: 'product', slug: featured.slug })}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
              e.preventDefault();
              onClose();
              navigate({ page: 'product', slug: featured.slug }, featured.slug);
            }}
            className="group col-span-4 flex self-start gap-4 rounded-xl bg-white p-3 ring-1 ring-[#1B1E1B]/8 hover:ring-[#1B1E1B]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37B5C]"
          >
            <div className="aspect-[3/4] w-28 shrink-0 overflow-hidden rounded-lg bg-[#F1EFEA]">
              <img
                src={featured.media?.front ?? featured.image}
                alt=""
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none"
              />
            </div>
            <div className="flex min-w-0 flex-col justify-center">
              <p className="text-xs text-[#5E625B]">{section.featuredNote}</p>
              <p className="mt-1 font-display text-xl font-semibold leading-tight text-[#1B1E1B]">{featured.name}</p>
              <p className="mt-2 text-sm font-medium tabular-nums text-[#1B1E1B]">{formatUsd(featured.price)}</p>
            </div>
          </a>
        )}
      </div>
    </div>
  );
}
