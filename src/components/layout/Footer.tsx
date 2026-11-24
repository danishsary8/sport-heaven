import { BRANCHES } from '../../data/catalog';
import { useStore } from '../../context/StoreContext';

export function Footer() {
  const { navigate, navigateToShop, openSizeGuide } = useStore();

  return (
    <footer className="border-t border-[#0E1113]/15 bg-[#0E1113] text-[#F4F2EC]">
      {/* Architectural Top Spec Strip */}
      <div className="border-b border-white/10">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 sm:px-6 lg:px-10 py-3.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/60">
          <span>SPORT CASTLE · PHNOM PENH</span>
          <span>DAILY 08:30 – 20:30 ICT</span>
          <span>ABA KHQR · WING · VISA · COD</span>
        </div>
      </div>

      {/* Main Multi-Column Enterprise Directory (All 35 Pages Accessible) */}
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12">
          {/* Brand Column */}
          <div className="lg:col-span-3 space-y-4">
            <button
              type="button"
              onClick={() => navigate({ page: 'home' })}
              className="text-left cursor-pointer"
            >
              <span className="font-display text-3xl font-extrabold uppercase tracking-[0.06em] text-[#FDFCF9]">
                SPORT CASTLE
              </span>
              <span className="block font-editorial italic text-base text-[#E5C56A] mt-0.5">
                Matchday Footwear, Kits &amp; Motorsport Atelier
              </span>
            </button>
            <p className="text-xs leading-relaxed text-white/65 max-w-xs">
              Cambodia’s specialist football and Formula 1 destination across
              Sonthormuk, Sen Sok, and Chomkadong. Authentic studded soccer boots and
              official match kits with 15-minute pro heat-press customization.
            </p>
            <div className="pt-2 space-y-1.5 text-xs text-white/75">
              {BRANCHES.map((branch) => (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => navigate({ page: 'branches' })}
                  className="flex w-full items-center justify-between border-b border-white/10 pb-1.5 text-left hover:text-[#E5C56A] transition-colors cursor-pointer"
                >
                  <span>{branch.name}</span>
                  <span className="font-mono text-[11px] text-white/50">{branch.phone}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 1. Storefront & Brands */}
          <div className="lg:col-span-2">
            <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#E5C56A]">
              01 · Shop &amp; Brands
            </h3>
            <ul className="mt-4 space-y-2 text-xs text-white/75">
              {[
                { label: 'Master Catalog (All 80)', fn: () => navigateToShop({ collectionSlug: 'all' }) },
                { label: 'Best Sellers & New Arrivals', fn: () => navigateToShop({ collectionSlug: 'best-sellers', bestSellersOnly: true }) },
                { label: 'Football Boots & Cleats', fn: () => navigateToShop({ collectionSlug: 'football-boots' }) },
                { label: 'National Teams & Retro Kits', fn: () => navigateToShop({ collectionSlug: 'national-teams', category: 'jerseys', league: 'International' }) },
                { label: '2026/27 UCL & Top 5 Kits', fn: () => navigateToShop({ collectionSlug: 'ucl-2026-27' }) },
                { label: 'F1 Jerseys & Paddock Jackets', fn: () => navigateToShop({ collectionSlug: 'f1-motorsport' }) },
                { label: 'Archive Markdowns (Sale)', fn: () => navigateToShop({ collectionSlug: 'sale' }) },
                { label: 'Gift Cards (Metal & Digital)', fn: () => navigate({ page: 'gift-card' }) },
              ].map((item) => (
                <li key={item.label}>
                  <button
                    type="button"
                    onClick={item.fn}
                    className="hover:text-white hover:underline underline-offset-4 cursor-pointer text-left"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* 2. Customer & Account */}
          <div className="lg:col-span-2">
            <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#E5C56A]">
              02 · Club Account
            </h3>
            <ul className="mt-4 space-y-2 text-xs text-white/75">
              {[
                { label: 'Club Dashboard', fn: () => navigate({ page: 'account', section: 'overview' }) },
                { label: 'Order History & Invoices', fn: () => navigate({ page: 'account', section: 'orders' }) },
                { label: 'Saved Addresses', fn: () => navigate({ page: 'account', section: 'addresses' }) },
                { label: 'Payment Vault (KHQR/Cards)', fn: () => navigate({ page: 'account', section: 'payments' }) },
                { label: 'Saved Gear Wishlist', fn: () => navigate({ page: 'account', section: 'wishlist' }) },
                { label: 'Full Shopping Cart', fn: () => navigate({ page: 'cart' }) },
                { label: 'Sign In / Create Account', fn: () => navigate({ page: 'login' }) },
                { label: 'Reset Password', fn: () => navigate({ page: 'recover' }) },
              ].map((item) => (
                <li key={item.label}>
                  <button
                    type="button"
                    onClick={item.fn}
                    className="hover:text-white hover:underline underline-offset-4 cursor-pointer text-left"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* 3. Support & Post-Purchase */}
          <div className="lg:col-span-2">
            <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#E5C56A]">
              03 · Post-Purchase
            </h3>
            <ul className="mt-4 space-y-2 text-xs text-white/75">
              {[
                { label: 'Track Order Lookup', fn: () => navigate({ page: 'orders' }) },
                { label: 'Returns & Exchanges (RMA)', fn: () => navigate({ page: 'returns' }) },
                { label: 'Help Center & FAQ', fn: () => navigate({ page: 'faq' }) },
                { label: 'Contact & Live Concierge', fn: () => navigate({ page: 'contact' }) },
                { label: 'Phnom Penh Store Locator', fn: () => navigate({ page: 'branches' }) },
                { label: 'Pitch Boot Finder', fn: () => navigate({ page: 'boot-finder' }) },
                { label: 'Custom Printing Studio', fn: () => navigate({ page: 'custom-studio' }) },
                { label: 'Boot & Jersey Size Guide', fn: () => openSizeGuide('boots') },
              ].map((item) => (
                <li key={item.label}>
                  <button
                    type="button"
                    onClick={item.fn}
                    className="hover:text-white hover:underline underline-offset-4 cursor-pointer text-left"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* 4. Editorial, Legal & System */}
          <div className="lg:col-span-3">
            <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#E5C56A]">
              04 · Editorial, Policies &amp; Index
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-white/75">
              {[
                { label: 'About Sport Castle', fn: () => navigate({ page: 'about' }) },
                { label: 'Privacy Policy', fn: () => navigate({ page: 'policy', slug: 'privacy-policy' }) },
                { label: 'Editorial Journal', fn: () => navigate({ page: 'blog' }) },
                { label: 'Terms of Service', fn: () => navigate({ page: 'policy', slug: 'terms-of-service' }) },
                { label: 'Matchday Lookbooks', fn: () => navigate({ page: 'lookbooks' }) },
                { label: 'Shipping Policy', fn: () => navigate({ page: 'policy', slug: 'shipping-policy' }) },
                { label: 'Black Friday Drop', fn: () => navigate({ page: 'campaign', slug: 'black-friday-pitch-drop' }) },
                { label: 'Refund & 30-Day Return', fn: () => navigate({ page: 'policy', slug: 'refund-policy' }) },
                { label: 'UCL 26/27 Launch', fn: () => navigate({ page: 'campaign', slug: 'ucl-2026-27-launch' }) },
                { label: 'Cookie Preferences', fn: () => navigate({ page: 'policy', slug: 'cookie-policy' }) },
                { label: 'HTML & XML Sitemap', fn: () => navigate({ page: 'sitemap' }) },
                { label: 'System Status / 500', fn: () => navigate({ page: 'maintenance' }) },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.fn}
                  className="hover:text-white hover:underline underline-offset-4 cursor-pointer text-left"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Legal & Crawler Links */}
        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-[11px] font-mono text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p>© 2026 SPORT CASTLE CAMBODIA CO., LTD. ALL RIGHTS RESERVED.</p>
            <p className="font-sans text-xs text-white/60">
              Product images © their respective brands. Portfolio demo, not a real store.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => navigate({ page: 'admin', tab: 'overview' })}
              className="hover:text-white cursor-pointer"
            >
              Admin Console
            </button>
            <button
              type="button"
              onClick={() => navigate({ page: 'system-health' })}
              className="hover:text-white cursor-pointer"
            >
              System Health
            </button>
            <button
              type="button"
              onClick={() => navigate({ page: 'sitemap' })}
              className="hover:text-white cursor-pointer"
            >
              Sitemap Directory
            </button>
            <a href="/sitemap.xml" className="hover:text-white">
              sitemap.xml
            </a>
            <a href="/robots.txt" className="hover:text-white">
              robots.txt
            </a>
            <button
              type="button"
              onClick={() => navigate({ page: 'not-found', attemptedPath: '/404' })}
              className="hover:text-white cursor-pointer"
            >
              404 Preview
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
