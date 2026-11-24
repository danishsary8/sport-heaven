import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Heart,
  Menu,
  Search,
  ShoppingBag,
  User,
  X,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { MegaMenuPanel, menuLinkHref, type MegaMenuKey } from './MegaMenuPanel';
import { CATEGORY_MENU, MAIN_MENU } from '../../data/navigation';
import { COLLECTION_BY_SLUG } from '../../data/editorial';
import { categoryFromCollectionSlug } from '../../lib/shop-filters';
import { routeToHash } from '../../utils/router';

export function Navbar() {
  const {
    route,
    navigate,
    navigateToShop,
    cart,
    wishlist,
    isAuthenticated,
    setCartOpen,
    setWishlistOpen,
    setSearchOpen,
  } = useStore();

  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openMegaMenu, setOpenMegaMenu] = useState<MegaMenuKey | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Publish the header height so sticky bars below it (shop filters) never hide under it.
  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const publish = () =>
      document.documentElement.style.setProperty('--header-h', `${el.getBoundingClientRect().height}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMegaMenu(null);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    setOpenMegaMenu(null);
    setMobileMenuOpen(false);
  }, [route]);

  const scheduleCloseMega = () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => setOpenMegaMenu(null), 160);
  };

  const cancelCloseMega = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const activeMenu = (() => {
    if (route.page !== 'shop') return null;
    const category =
      categoryFromCollectionSlug(route.collectionSlug) ??
      COLLECTION_BY_SLUG.get(route.collectionSlug ?? '')?.preset.category ??
      'all';
    return CATEGORY_MENU[category];
  })();

  const navItems: Array<{
    label: string;
    active: boolean;
    megaKey?: MegaMenuKey;
    href: string;
    onClick: () => void;
  }> = [
    ...MAIN_MENU.map((section) => ({
      label: section.label,
      active: activeMenu === section.key,
      megaKey: section.key,
      href: menuLinkHref(section.all),
      onClick: () => navigateToShop({ category: section.all.category }),
    })),
    {
      label: 'Custom Studio',
      active: route.page === 'custom-studio',
      href: routeToHash({ page: 'custom-studio' }),
      onClick: () => navigate({ page: 'custom-studio' }),
    },
  ];

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 bg-[#FDFCF9]/96 backdrop-blur-md border-b border-[#0E1113]/12"
      onMouseLeave={scheduleCloseMega}
    >
      {/* Minimalist Top Announcement Bar */}
      {!bannerDismissed && (
        <div className="bg-[#0E1113] text-[#F4F2EC]">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10 py-1.5 text-[11px] font-mono tracking-[0.06em]">
            <div className="flex min-w-0 flex-1 items-center justify-center sm:justify-start gap-2 overflow-hidden">
              <button
                type="button"
                onClick={() => navigate({ page: 'campaign', slug: 'black-friday-pitch-drop' })}
                className="truncate text-left text-[#F4F2EC]/90 hover:text-[#E5C56A] transition-colors cursor-pointer"
              >
                Free Phnom Penh Delivery Over $50 · Code CASTLE10 (-10%)
              </button>
            </div>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              aria-label="Dismiss announcement"
              className="shrink-0 p-0.5 text-white/55 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main 3-Zone Minimalist Header */}
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        {/* Left: Brand Wordmark */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex lg:hidden h-10 w-10 items-center justify-center border border-[#0E1113]/15 text-[#0E1113] hover:bg-[#EAE7DF] cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <button
            type="button"
            onClick={() => navigate({ page: 'home' })}
            className="text-left cursor-pointer group"
          >
            <span className="whitespace-nowrap font-display text-xl sm:text-[26px] font-extrabold uppercase tracking-[0.06em] text-[#0E1113] leading-none">
              SPORT CASTLE
            </span>
          </button>
        </div>

        {/* Center: 5 Primary Navigation Links */}
        <nav
          aria-label="Primary navigation"
          className="hidden lg:flex items-center gap-8"
        >
          {navItems.map((item) => {
            const isMenuOpen = item.megaKey && openMegaMenu === item.megaKey;
            return (
              <a
                key={item.label}
                href={item.href}
                aria-current={item.active ? 'page' : undefined}
                {...(item.megaKey ? { 'aria-expanded': Boolean(isMenuOpen) } : {})}
                onMouseEnter={() => {
                  cancelCloseMega();
                  if (item.megaKey) setOpenMegaMenu(item.megaKey);
                  else setOpenMegaMenu(null);
                }}
                onFocus={() => {
                  cancelCloseMega();
                  if (item.megaKey) setOpenMegaMenu(item.megaKey);
                }}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                  e.preventDefault();
                  setOpenMegaMenu(null);
                  item.onClick();
                }}
                className={`relative inline-flex items-center gap-1 py-2 min-h-11 text-[13px] font-semibold uppercase tracking-[0.09em] transition-colors cursor-pointer whitespace-nowrap ${
                  item.active || isMenuOpen
                    ? 'text-[#0E1113]'
                    : 'text-[#5A5D57] hover:text-[#0E1113]'
                }`}
              >
                <span>{item.label}</span>
                {item.megaKey && (
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${
                      isMenuOpen ? 'rotate-180 text-[#C8232C]' : ''
                    }`}
                  />
                )}
                {(item.active || isMenuOpen) && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[17px] h-[2px] bg-[#C8232C]"
                  />
                )}
              </a>
            );
          })}
        </nav>

        {/* Right: Search, Account, Wishlist, Bag */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search catalog"
            title="Search catalog (⌘K)"
            className="inline-flex h-10 w-10 items-center justify-center text-[#0E1113] hover:bg-[#EAE7DF] transition-colors cursor-pointer"
          >
            <Search className="h-[18px] w-[18px]" strokeWidth={1.7} />
          </button>

          <button
            type="button"
            onClick={() =>
              navigate(isAuthenticated ? { page: 'account', section: 'overview' } : { page: 'login' })
            }
            aria-label="Sport Castle Club Account"
            title={isAuthenticated ? 'Sport Castle Club Account' : 'Sign in'}
            className={`hidden sm:inline-flex h-10 w-10 items-center justify-center transition-colors cursor-pointer ${
              route.page === 'account' || route.page === 'login' || route.page === 'register'
                ? 'bg-[#0E1113] text-[#FDFCF9]'
                : 'text-[#0E1113] hover:bg-[#EAE7DF]'
            }`}
          >
            <User className="h-[18px] w-[18px]" strokeWidth={1.7} />
          </button>

          <button
            type="button"
            onClick={() => setWishlistOpen(true)}
            aria-label={`Open wishlist (${wishlist.length} saved)`}
            className="relative inline-flex h-10 w-10 items-center justify-center text-[#0E1113] hover:bg-[#EAE7DF] transition-colors cursor-pointer"
          >
            <Heart className="h-[18px] w-[18px]" strokeWidth={1.7} />
            {wishlist.length > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center bg-[#C8232C] px-1 font-mono text-[10px] font-bold text-white">
                {wishlist.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label={`Open shopping bag (${cartCount} items)`}
            className="inline-flex h-10 items-center gap-2 bg-[#0E1113] px-3.5 text-xs font-semibold uppercase tracking-[0.1em] text-[#FDFCF9] hover:bg-[#C8232C] transition-colors cursor-pointer"
          >
            <ShoppingBag className="h-4 w-4" strokeWidth={1.8} />
            <span className="hidden sm:inline">Bag</span>
            <span className="font-mono text-[11px] font-bold tabular-nums">
              {cartCount}
            </span>
          </button>
        </div>
      </div>

      {/* Desktop Visual Thumbnail Mega-Menu */}
      {openMegaMenu && (
        <div onMouseEnter={cancelCloseMega} onMouseLeave={scheduleCloseMega}>
          <MegaMenuPanel
            activeKey={openMegaMenu}
            onClose={() => setOpenMegaMenu(null)}
          />
        </div>
      )}

      {/* Mobile navigation: one expandable group per menu section */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile navigation"
          className="lg:hidden max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-[#1B1E1B]/10 bg-[#FAF9F5] px-4 pb-6 shadow-xl animate-mega-unfold"
        >
          <ul className="divide-y divide-[#1B1E1B]/10">
            {MAIN_MENU.map((section) => (
              <li key={section.key}>
                <details className="group" open={activeMenu === section.key}>
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-base font-semibold text-[#1B1E1B] [&::-webkit-details-marker]:hidden">
                    {section.label}
                    <ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
                  </summary>
                  <div className="pb-3">
                    <a
                      href={menuLinkHref(section.all)}
                      onClick={(e) => {
                        e.preventDefault();
                        setMobileMenuOpen(false);
                        navigateToShop({ category: section.all.category });
                      }}
                      className="flex min-h-11 items-center text-sm font-semibold text-[#1B1E1B] underline decoration-[#A37B5C] decoration-2 underline-offset-4"
                    >
                      {section.all.label}
                    </a>
                    {section.columns.map((column) => (
                      <div key={column.title} className="mt-2">
                        <p className="text-xs font-medium text-[#5E625B]">{column.title}</p>
                        <ul className="mt-1 flex flex-wrap gap-2">
                          {column.links.map((link) => (
                            <li key={link.label}>
                              <a
                                href={menuLinkHref(link)}
                                onClick={(e) => {
                                  e.preventDefault();
                                  setMobileMenuOpen(false);
                                  navigateToShop({ category: link.category, params: link.params });
                                }}
                                className="inline-flex min-h-11 items-center rounded-full border border-[#1B1E1B]/15 bg-white px-4 text-sm text-[#1B1E1B]"
                              >
                                {link.label}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </details>
              </li>
            ))}
            {[
              { label: 'Custom Studio', route: { page: 'custom-studio' } as const },
              { label: 'Journal', route: { page: 'blog' } as const },
              { label: 'Lookbooks', route: { page: 'lookbooks' } as const },
              { label: 'Gift cards', route: { page: 'gift-card' } as const },
              { label: 'Track an order', route: { page: 'orders' } as const },
              { label: 'Stores in Phnom Penh', route: { page: 'branches' } as const },
              { label: 'My account', route: { page: 'account', section: 'overview' } as const },
            ].map((item) => (
              <li key={item.label}>
                <a
                  href={routeToHash(item.route)}
                  onClick={(e) => {
                    e.preventDefault();
                    setMobileMenuOpen(false);
                    navigate(item.route);
                  }}
                  className="flex min-h-12 items-center text-base font-medium text-[#1B1E1B]"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
