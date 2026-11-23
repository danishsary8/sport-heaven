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
import { MegaMenuPanel, type MegaMenuKey } from './MegaMenuPanel';

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

  const navItems: Array<{
    label: string;
    active: boolean;
    megaKey?: MegaMenuKey;
    onClick: () => void;
  }> = [
    {
      label: 'Collections',
      active: route.page === 'shop' || route.page === 'brand',
      megaKey: 'brands',
      onClick: () => navigateToShop({ collectionSlug: 'all', category: 'all' }),
    },
    {
      label: 'Boots',
      active:
        route.page === 'shop' &&
        (route.collectionSlug === 'football-boots' || route.initialCategory === 'boots'),
      megaKey: 'boots',
      onClick: () => navigateToShop({ collectionSlug: 'football-boots', category: 'boots' }),
    },
    {
      label: 'Jerseys & F1',
      active:
        route.page === 'shop' &&
        (route.collectionSlug === 'jerseys-kits' || route.initialCategory === 'jerseys'),
      megaKey: 'jerseys',
      onClick: () => navigateToShop({ collectionSlug: 'jerseys-kits', category: 'jerseys' }),
    },
    {
      label: 'Journal',
      active: route.page === 'blog' || route.page === 'blog-post' || route.page === 'lookbooks',
      onClick: () => navigate({ page: 'blog' }),
    },
    {
      label: 'Custom Studio',
      active: route.page === 'custom-studio',
      onClick: () => navigate({ page: 'custom-studio' }),
    },
  ];

  return (
    <header
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
            <span className="font-display text-2xl sm:text-[26px] font-extrabold uppercase tracking-[0.06em] text-[#0E1113] leading-none">
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
              <button
                key={item.label}
                type="button"
                onMouseEnter={() => {
                  cancelCloseMega();
                  if (item.megaKey) setOpenMegaMenu(item.megaKey);
                  else setOpenMegaMenu(null);
                }}
                onFocus={() => {
                  cancelCloseMega();
                  if (item.megaKey) setOpenMegaMenu(item.megaKey);
                }}
                onClick={() => {
                  setOpenMegaMenu(null);
                  item.onClick();
                }}
                className={`relative inline-flex items-center gap-1 py-2 text-[13px] font-semibold uppercase tracking-[0.09em] transition-colors cursor-pointer whitespace-nowrap ${
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
              </button>
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

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#0E1113]/12 bg-[#FDFCF9] px-4 py-4 shadow-xl animate-mega-unfold">
          <div className="flex flex-col divide-y divide-[#0E1113]/10">
            {[
              { label: 'Master Catalog (80 Items)', action: () => navigateToShop({ collectionSlug: 'all' }) },
              { label: 'Football Boots & Cleats', action: () => navigateToShop({ collectionSlug: 'football-boots' }) },
              { label: '2026/27 Jerseys & UCL Kits', action: () => navigateToShop({ collectionSlug: 'jerseys-kits' }) },
              { label: 'F1 Paddock Collection', action: () => navigateToShop({ collectionSlug: 'f1-motorsport' }) },
              { label: 'Matchday Lookbooks (-10%)', action: () => navigate({ page: 'lookbooks' }) },
              { label: 'Editorial Journal & Guides', action: () => navigate({ page: 'blog' }) },
              { label: 'Custom Printing Studio', action: () => navigate({ page: 'custom-studio' }) },
              { label: 'Gift Cards (Digital & Metal)', action: () => navigate({ page: 'gift-card' }) },
              { label: 'Full Shopping Cart', action: () => navigate({ page: 'cart' }) },
              { label: 'Sport Castle Club Account', action: () => navigate({ page: 'account', section: 'overview' }) },
              { label: 'Track Order & Returns', action: () => navigate({ page: 'orders' }) },
              { label: 'Phnom Penh Store Locator', action: () => navigate({ page: 'branches' }) },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  item.action();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-between py-3 text-left text-sm font-medium text-[#0E1113] hover:text-[#C8232C] cursor-pointer"
              >
                <span>{item.label}</span>
                <span className="font-mono text-xs text-[#5A5D57]">→</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
