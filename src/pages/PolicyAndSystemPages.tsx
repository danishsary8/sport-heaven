import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Code2,
  Cookie,
  FileText,
  Home,
  Search,
  Shield,
  Wrench,
} from 'lucide-react';
import { ProductCard } from '../components/product';
import { PRODUCTS } from '../data/catalog';
import {
  BLOG_ARTICLES,
  BRAND_PROFILES,
  CAMPAIGN_LANDINGS,
  COLLECTION_CATALOG,
  LEGAL_POLICIES,
} from '../data/editorial';
import { useStore } from '../context/StoreContext';
import type { PolicySlug } from '../types/store';
import { buildRobotsTxt, buildXmlSitemap } from '../utils/router';

export function PolicyPage({ slug }: { slug: PolicySlug }) {
  const { navigate, cookieConsent, saveCookieConsent } = useStore();
  const policy = LEGAL_POLICIES[slug] ?? LEGAL_POLICIES['privacy-policy'];
  const [analytics, setAnalytics] = useState(cookieConsent.analytics);
  const [marketing, setMarketing] = useState(cookieConsent.marketing);

  const policyList = Object.values(LEGAL_POLICIES);

  return (
    <div className="min-h-screen bg-[#F4F2EC] pb-20">
      <section className="border-b border-[#0E1113]/15 bg-[#0E1113] text-[#FDFCF9]">
        <div className="mx-auto max-w-[1380px] px-4 py-12 sm:px-6 lg:px-10">
          <p className="font-mono text-[10px] tracking-[0.26em] text-[#B8933B] uppercase">
            LEGAL &amp; COMPLIANCE ARCHIVE · UPDATED {policy.updatedAt}
          </p>
          <h1 className="mt-3 font-display text-5xl leading-[0.9] font-extrabold uppercase sm:text-6xl">
            {policy.title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-[#FDFCF9]/70">{policy.summary}</p>
        </div>
      </section>

      <div className="mx-auto mt-10 max-w-[1380px] px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Policy Switcher */}
          <aside className="lg:col-span-3">
            <div className="sticky top-28 border border-[#0E1113]/15 bg-[#FDFCF9] p-4">
              <p className="mb-3 font-mono text-[10px] font-bold tracking-[0.2em] text-[#0E1113]/55 uppercase">
                POLICY DIRECTORY
              </p>
              <nav className="space-y-1.5">
                {policyList.map((doc) => (
                  <button
                    key={doc.slug}
                    type="button"
                    onClick={() => navigate({ page: 'policy', slug: doc.slug })}
                    className={`flex w-full items-center justify-between px-3 py-2.5 text-left font-mono text-[11px] uppercase transition ${
                      doc.slug === policy.slug
                        ? 'bg-[#0E1113] font-bold text-[#FDFCF9]'
                        : 'bg-[#F4F2EC]/60 text-[#0E1113]/75 hover:bg-[#EAE7DF]'
                    }`}
                  >
                    <span>{doc.title}</span>
                    <FileText className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Policy Document Content */}
          <div className="space-y-6 lg:col-span-9">
            <div className="space-y-8 border border-[#0E1113]/15 bg-[#FDFCF9] p-7 sm:p-10">
              {policy.sections.map((sec) => (
                <section key={sec.heading}>
                  <h2 className="font-display text-2xl font-extrabold text-[#0E1113] uppercase">
                    {sec.heading}
                  </h2>
                  <div className="mt-3 space-y-3 text-sm leading-relaxed text-[#0E1113]/80">
                    {sec.paragraphs.map((p, idx) => (
                      <p key={idx}>{p}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {/* Interactive Cookie Consent Controls on Cookie Policy */}
            {slug === 'cookie-policy' && (
              <div className="border-2 border-[#0E1113] bg-[#FDFCF9] p-7">
                <div className="flex items-center gap-2 font-mono text-[11px] font-bold tracking-[0.2em] text-[#0E1113] uppercase">
                  <Cookie className="h-4 w-4 text-[#B8933B]" />
                  INTERACTIVE COOKIE CONSENT CONTROLS
                </div>
                <p className="mt-2 text-xs text-[#0E1113]/70">
                  Manage your browser storage preferences below. Changes apply immediately.
                </p>

                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between border border-[#0E1113]/15 bg-[#F4F2EC] p-4">
                    <div>
                      <p className="font-mono text-xs font-bold text-[#0E1113] uppercase">
                        Essential Storefront Storage
                      </p>
                      <p className="text-xs text-[#0E1113]/65">
                        Cart persistence, Club authentication, custom jersey state. Always active.
                      </p>
                    </div>
                    <span className="border border-emerald-700/30 bg-emerald-50 px-2.5 py-1 font-mono text-[10px] font-bold text-emerald-800 uppercase">
                      Always On
                    </span>
                  </div>

                  <label className="flex cursor-pointer items-center justify-between border border-[#0E1113]/15 bg-[#F4F2EC] p-4">
                    <div>
                      <p className="font-mono text-xs font-bold text-[#0E1113] uppercase">
                        Performance &amp; Pitch Analytics
                      </p>
                      <p className="text-xs text-[#0E1113]/65">
                        Helps stock the right EU boot sizes and Phnom Penh turf outsoles.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={analytics}
                      onChange={(e) => setAnalytics(e.target.checked)}
                      className="h-4 w-4 accent-[#0E1113]"
                    />
                  </label>

                  <label className="flex cursor-pointer items-center justify-between border border-[#0E1113]/15 bg-[#F4F2EC] p-4">
                    <div>
                      <p className="font-mono text-xs font-bold text-[#0E1113] uppercase">
                        Marketing &amp; Restock Alerts
                      </p>
                      <p className="text-xs text-[#0E1113]/65">
                        Personalized Matchday Lookbooks and drop notifications.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={marketing}
                      onChange={(e) => setMarketing(e.target.checked)}
                      className="h-4 w-4 accent-[#0E1113]"
                    />
                  </label>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => saveCookieConsent({ analytics, marketing })}
                    className="inline-flex items-center gap-2 bg-[#0E1113] px-5 py-3 font-mono text-[11px] font-bold tracking-[0.16em] text-[#FDFCF9] uppercase hover:bg-[#C8232C]"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Save Preferences
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAnalytics(false);
                      setMarketing(false);
                      saveCookieConsent({ analytics: false, marketing: false });
                    }}
                    className="border border-[#0E1113]/20 px-4 py-3 font-mono text-[11px] font-semibold tracking-[0.14em] text-[#0E1113] uppercase hover:border-[#0E1113]"
                  >
                    Essential Only
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotFoundPage({ attemptedPath }: { attemptedPath?: string }) {
  const { navigate } = useStore();
  const [query, setQuery] = useState('');
  const bestsellers = PRODUCTS.filter((p) => p.isFeatured).slice(0, 4);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ page: 'search', query });
  };

  return (
    <div className="min-h-screen bg-[#F4F2EC] py-14">
      <div className="mx-auto max-w-[1380px] px-4 sm:px-6 lg:px-10">
        <div className="border border-[#0E1113]/15 bg-[#FDFCF9] p-8 sm:p-12">
          <div className="flex items-center gap-2 font-mono text-[11px] font-bold tracking-[0.22em] text-[#C8232C] uppercase">
            <AlertTriangle className="h-4 w-4" />
            OFFSIDE · ERROR 404
          </div>
          <h1 className="mt-3 font-display text-6xl leading-[0.88] font-extrabold text-[#0E1113] uppercase sm:text-7xl">
            Page Out of{' '}
            <span className="font-editorial font-normal italic text-[#0E1113]/75 normal-case">
              Bounds
            </span>
          </h1>
          <p className="mt-3 max-w-xl text-sm text-[#0E1113]/70">
            The route{' '}
            <code className="bg-[#EAE7DF] px-1.5 py-0.5 font-mono text-xs text-[#0E1113]">
              {attemptedPath || '/404'}
            </code>{' '}
            could not be located in the Sport Castle archive. Search our 51-item catalog or jump straight to our flagship collections below.
          </p>

          <form onSubmit={handleSearch} className="mt-6 flex max-w-xl flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#0E1113]/45" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Barcelona, Predator 25, Mizuno, F1..."
                className="w-full border border-[#0E1113]/20 bg-[#F4F2EC] py-3 pr-4 pl-10 text-sm outline-none focus:border-[#0E1113]"
              />
            </div>
            <button
              type="submit"
              className="bg-[#0E1113] px-5 py-3 font-mono text-xs font-bold tracking-[0.16em] text-[#FDFCF9] uppercase hover:bg-[#C8232C]"
            >
              Search
            </button>
          </form>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate({ page: 'home' })}
              className="inline-flex items-center gap-1.5 bg-[#0E1113] px-4 py-2.5 font-mono text-[11px] font-bold text-[#FDFCF9] uppercase hover:bg-[#C8232C]"
            >
              <Home className="h-3.5 w-3.5" /> Return Home
            </button>
            {COLLECTION_CATALOG.slice(0, 5).map((col) => (
              <button
                key={col.slug}
                type="button"
                onClick={() => navigate({ page: 'shop', collectionSlug: col.slug })}
                className="border border-[#0E1113]/20 bg-[#F4F2EC] px-3.5 py-2.5 font-mono text-[11px] font-semibold text-[#0E1113] uppercase hover:border-[#0E1113]"
              >
                {col.title.split('—')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Popular Bestsellers Fallback */}
        <div className="mt-12">
          <p className="font-mono text-[10px] font-bold tracking-[0.24em] text-[#B8933B] uppercase">
            POPULAR PHNOM PENH PICKS
          </p>
          <h2 className="mt-1 font-display text-3xl font-extrabold uppercase">
            Back in Play — Bestsellers
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {bestsellers.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MaintenancePage() {
  const { navigate } = useStore();
  return (
    <div className="flex min-h-[82vh] items-center justify-center bg-[#0E1113] px-4 py-16 text-[#FDFCF9]">
      <div className="w-full max-w-2xl border border-[#FDFCF9]/15 bg-[#15191D] p-8 sm:p-12">
        <div className="flex items-center gap-2 font-mono text-[11px] font-bold tracking-[0.24em] text-[#B8933B] uppercase">
          <Wrench className="h-4 w-4" />
          HALF-TIME MAINTENANCE · STATUS 503
        </div>
        <h1 className="mt-4 font-display text-5xl leading-[0.9] font-extrabold uppercase sm:text-6xl">
          Restocking the{' '}
          <span className="font-editorial font-normal italic text-[#EAE7DF] normal-case">
            Kit Room
          </span>
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-[#FDFCF9]/75">
          We are synchronizing fresh 2026/27 UEFA Champions League inventory and heat-press queue capacity across Sonthormuk, Sen Sok, and Chomkadong. All existing orders and Phnom Penh rider dispatches remain unaffected.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-3 border-y border-[#FDFCF9]/15 py-5 font-mono text-xs sm:grid-cols-2">
          <div>
            <p className="text-[10px] text-[#FDFCF9]/45 uppercase">URGENT ORDER SUPPORT</p>
            <p className="mt-1 text-[#FDFCF9]">Telegram: @SportCastleKH</p>
          </div>
          <div>
            <p className="text-[10px] text-[#FDFCF9]/45 uppercase">ESTIMATED KICKOFF</p>
            <p className="mt-1 text-emerald-400">All Storefront Systems Operational</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate({ page: 'home' })}
            className="inline-flex items-center gap-2 bg-[#C8232C] px-5 py-3 font-mono text-xs font-bold tracking-[0.16em] text-[#FDFCF9] uppercase hover:bg-[#FDFCF9] hover:text-[#0E1113]"
          >
            Return to Live Storefront <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => navigate({ page: 'system-health' })}
            className="border border-[#FDFCF9]/25 px-5 py-3 font-mono text-xs font-semibold tracking-[0.16em] text-[#FDFCF9] uppercase hover:border-[#FDFCF9]"
          >
            System Health Dashboard
          </button>
          <button
            type="button"
            onClick={() => navigate({ page: 'branches' })}
            className="border border-[#FDFCF9]/25 px-5 py-3 font-mono text-xs font-semibold tracking-[0.16em] text-[#FDFCF9] uppercase hover:border-[#FDFCF9]"
          >
            Branch Hours &amp; Locations
          </button>
        </div>
      </div>
    </div>
  );
}

export function SitemapPage() {
  const { navigate } = useStore();
  const [inspector, setInspector] = useState<'html' | 'xml' | 'robots'>('html');

  const xmlPreview = useMemo(() => buildXmlSitemap(), []);
  const robotsPreview = useMemo(() => buildRobotsTxt(), []);

  return (
    <div className="min-h-screen bg-[#F4F2EC] pb-20">
      <section className="border-b border-[#0E1113]/15 bg-[#0E1113] text-[#FDFCF9]">
        <div className="mx-auto max-w-[1380px] px-4 py-12 sm:px-6 lg:px-10">
          <p className="font-mono text-[10px] tracking-[0.26em] text-[#B8933B] uppercase">
            ARCHITECTURAL INDEX · ALL 35 PRODUCTION PAGES
          </p>
          <div className="mt-3 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <h1 className="font-display text-5xl leading-[0.9] font-extrabold uppercase sm:text-6xl">
                Storefront{' '}
                <span className="font-editorial font-normal italic text-[#EAE7DF] normal-case">
                  Sitemap &amp; SEO
                </span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-[#FDFCF9]/70">
                Complete human-readable directory of every Sport Castle storefront route, collection, brand boutique, editorial guide, legal policy, plus live `/sitemap.xml` and `/robots.txt` crawler artifacts.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'html', label: 'HTML Directory' },
                { id: 'xml', label: '/sitemap.xml' },
                { id: 'robots', label: '/robots.txt' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setInspector(tab.id as 'html' | 'xml' | 'robots')}
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 font-mono text-[11px] font-bold uppercase ${
                    inspector === tab.id
                      ? 'bg-[#C8232C] text-[#FDFCF9]'
                      : 'border border-[#FDFCF9]/25 text-[#FDFCF9]/80 hover:border-[#FDFCF9]'
                  }`}
                >
                  <Code2 className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto mt-10 max-w-[1380px] px-4 sm:px-6 lg:px-10">
        {inspector === 'xml' ? (
          <div className="border border-[#0E1113]/15 bg-[#0E1113] p-6 text-[#EAE7DF]">
            <div className="mb-3 flex items-center justify-between font-mono text-xs text-[#B8933B]">
              <span>LIVE GENERATED SITEMAP.XML ({PRODUCTS.length + 34} URLS)</span>
              <a
                href="/sitemap.xml"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-[#FDFCF9]"
              >
                Open Raw /sitemap.xml ↗
              </a>
            </div>
            <pre className="max-h-[540px] overflow-auto font-mono text-xs leading-relaxed text-[#FDFCF9]/85">
              {xmlPreview}
            </pre>
          </div>
        ) : inspector === 'robots' ? (
          <div className="border border-[#0E1113]/15 bg-[#0E1113] p-6 text-[#EAE7DF]">
            <div className="mb-3 flex items-center justify-between font-mono text-xs text-[#B8933B]">
              <span>CRAWLER DIRECTIVES · /ROBOTS.TXT</span>
              <a
                href="/robots.txt"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-[#FDFCF9]"
              >
                Open Raw /robots.txt ↗
              </a>
            </div>
            <pre className="overflow-auto font-mono text-xs leading-relaxed text-[#FDFCF9]/85">
              {robotsPreview}
            </pre>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Suite 1: Discovery & Collections */}
            <div className="border border-[#0E1113]/15 bg-[#FDFCF9] p-6">
              <p className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#B8933B] uppercase">
                01 · STOREFRONT &amp; COLLECTIONS
              </p>
              <ul className="mt-4 space-y-2 text-xs">
                <li>
                  <button
                    type="button"
                    onClick={() => navigate({ page: 'home' })}
                    className="font-semibold hover:text-[#C8232C]"
                  >
                    Homepage (/)
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate({ page: 'search', query: '' })}
                    className="font-semibold hover:text-[#C8232C]"
                  >
                    Global Search Results (/search?q=...)
                  </button>
                </li>
                {COLLECTION_CATALOG.map((c) => (
                  <li key={c.slug}>
                    <button
                      type="button"
                      onClick={() => navigate({ page: 'shop', collectionSlug: c.slug })}
                      className="text-[#0E1113]/80 hover:text-[#C8232C]"
                    >
                      {c.title} (/collections/{c.slug})
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Suite 1b: Brands */}
            <div className="border border-[#0E1113]/15 bg-[#FDFCF9] p-6">
              <p className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#B8933B] uppercase">
                02 · OFFICIAL BRAND BOUTIQUES
              </p>
              <ul className="mt-4 space-y-2 text-xs">
                {BRAND_PROFILES.map((b) => (
                  <li key={b.slug}>
                    <button
                      type="button"
                      onClick={() => navigate({ page: 'brand', slug: b.slug })}
                      className="text-[#0E1113]/80 hover:text-[#C8232C]"
                    >
                      {b.display} (/brands/{b.slug})
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Suite 2: Conversion & Account */}
            <div className="border border-[#0E1113]/15 bg-[#FDFCF9] p-6">
              <p className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#B8933B] uppercase">
                03 · CONVERSION &amp; CLUB ACCOUNT
              </p>
              <ul className="mt-4 space-y-2 text-xs">
                {[
                  { label: 'Shopping Cart (/cart)', route: { page: 'cart' } as const },
                  { label: 'Checkout Flow (/checkout)', route: { page: 'checkout' } as const },
                  { label: 'Order Confirmation (/checkout/thank-you)', route: { page: 'thank-you' } as const },
                  { label: 'Gift Cards (/products/gift-card)', route: { page: 'gift-card' } as const },
                  { label: 'Member Login (/account/login)', route: { page: 'login' } as const },
                  { label: 'Create Account (/account/register)', route: { page: 'register' } as const },
                  { label: 'Password Recovery (/account/recover)', route: { page: 'recover' } as const },
                  { label: 'Account Dashboard (/account)', route: { page: 'account', section: 'overview' } as const },
                  { label: 'Order History & Invoices (/account/orders)', route: { page: 'account', section: 'orders' } as const },
                  { label: 'Address Book (/account/addresses)', route: { page: 'account', section: 'addresses' } as const },
                  { label: 'Saved Payment Vault (/account/payments)', route: { page: 'account', section: 'payments' } as const },
                  { label: 'Saved Wishlist (/account/wishlist)', route: { page: 'account', section: 'wishlist' } as const },
                ].map((link) => (
                  <li key={link.label}>
                    <button
                      type="button"
                      onClick={() => navigate(link.route)}
                      className="text-[#0E1113]/80 hover:text-[#C8232C]"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Suite 4: Post-Purchase & Support */}
            <div className="border border-[#0E1113]/15 bg-[#FDFCF9] p-6">
              <p className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#B8933B] uppercase">
                04 · POST-PURCHASE &amp; SUPPORT
              </p>
              <ul className="mt-4 space-y-2 text-xs">
                {[
                  { label: 'Order Tracking Lookup (/pages/track-order)', route: { page: 'orders' } as const },
                  { label: 'Returns & Exchanges RMA (/pages/returns)', route: { page: 'returns' } as const },
                  { label: 'Help Center & FAQ (/pages/faq)', route: { page: 'faq' } as const },
                  { label: 'Contact Us & Live Chat (/pages/contact)', route: { page: 'contact' } as const },
                  { label: 'Phnom Penh Store Locator (/pages/stores)', route: { page: 'branches' } as const },
                  { label: 'Custom Jersey Heat-Press Studio (/custom-studio)', route: { page: 'custom-studio' } as const },
                  { label: 'Boot Surface & Size Finder (/boot-finder)', route: { page: 'boot-finder' } as const },
                ].map((link) => (
                  <li key={link.label}>
                    <button
                      type="button"
                      onClick={() => navigate(link.route)}
                      className="text-[#0E1113]/80 hover:text-[#C8232C]"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Suite 5: Editorial & Campaigns */}
            <div className="border border-[#0E1113]/15 bg-[#FDFCF9] p-6">
              <p className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#B8933B] uppercase">
                05 · BRAND, JOURNAL &amp; CAMPAIGNS
              </p>
              <ul className="mt-4 space-y-2 text-xs">
                <li>
                  <button
                    type="button"
                    onClick={() => navigate({ page: 'about' })}
                    className="font-semibold hover:text-[#C8232C]"
                  >
                    About Sport Castle (/pages/about)
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate({ page: 'lookbooks' })}
                    className="text-[#0E1113]/80 hover:text-[#C8232C]"
                  >
                    Matchday Lookbooks (/lookbooks)
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate({ page: 'blog' })}
                    className="font-semibold hover:text-[#C8232C]"
                  >
                    Pitch Journal Hub (/blogs/news)
                  </button>
                </li>
                {BLOG_ARTICLES.map((a) => (
                  <li key={a.slug}>
                    <button
                      type="button"
                      onClick={() => navigate({ page: 'blog-post', slug: a.slug })}
                      className="text-[#0E1113]/75 hover:text-[#C8232C]"
                    >
                      • {a.title.slice(0, 46)}…
                    </button>
                  </li>
                ))}
                {CAMPAIGN_LANDINGS.map((c) => (
                  <li key={c.slug}>
                    <button
                      type="button"
                      onClick={() => navigate({ page: 'campaign', slug: c.slug })}
                      className="font-semibold text-[#C8232C] hover:underline"
                    >
                      Campaign: {c.title} (/pages/{c.slug})
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Suite 6 & 7: Policies & System */}
            <div className="border border-[#0E1113]/15 bg-[#FDFCF9] p-6">
              <p className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#B8933B] uppercase">
                06 &amp; 07 · LEGAL &amp; SYSTEM UTILITIES
              </p>
              <ul className="mt-4 space-y-2 text-xs">
                {(Object.keys(LEGAL_POLICIES) as PolicySlug[]).map((slug) => (
                  <li key={slug}>
                    <button
                      type="button"
                      onClick={() => navigate({ page: 'policy', slug })}
                      className="text-[#0E1113]/80 hover:text-[#C8232C]"
                    >
                      {LEGAL_POLICIES[slug].title} (/policies/{slug})
                    </button>
                  </li>
                ))}
                <li className="pt-2">
                  <button
                    type="button"
                    onClick={() => navigate({ page: 'not-found', attemptedPath: '/demo-404' })}
                    className="text-[#0E1113]/80 hover:text-[#C8232C]"
                  >
                    404 Error Recovery Page (/404)
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate({ page: 'maintenance' })}
                    className="text-[#0E1113]/80 hover:text-[#C8232C]"
                  >
                    500 / Maintenance Mode (/maintenance)
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate({ page: 'system-health' })}
                    className="font-semibold text-[#0E1113] hover:text-[#C8232C]"
                  >
                    System Health Monitor (/system-health)
                  </button>
                </li>
              </ul>
              <div className="mt-5 flex items-center gap-2 border-t border-[#0E1113]/10 pt-4 font-mono text-[10px] text-[#0E1113]/60">
                <Shield className="h-3.5 w-3.5 text-[#0E1113]" />
                Schema.org JSON-LD + XML Sitemap Active
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
