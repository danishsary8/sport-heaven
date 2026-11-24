import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Footer, Navbar } from './components/layout';
import {
  CartDrawer,
  CookieConsentBanner,
  ProductQuickViewModal,
  SearchModal,
  SizeGuideModal,
  ToastContainer,
  WishlistDrawer,
} from './components/overlays';
import { HomePage } from './pages/HomePage';
// Every page except Home loads on first visit, so the first download stays small.
function page<M extends Record<K, ComponentType<any>>, K extends keyof M>(load: () => Promise<M>, name: K) {
  return lazy(() => load().then((m) => ({ default: m[name] })));
}

const ShopPage = page(() => import('./pages/ShopPage'), 'ShopPage');
const BrandPage = page(() => import('./pages/BrandPage'), 'BrandPage');
const SearchResultsPage = page(() => import('./pages/SearchResultsPage'), 'SearchResultsPage');
const ProductDetailPage = page(() => import('./pages/ProductDetailPage'), 'ProductDetailPage');
const GiftCardPage = page(() => import('./pages/GiftCardPage'), 'GiftCardPage');
const CartPage = page(() => import('./pages/CartPage'), 'CartPage');
const CheckoutPage = page(() => import('./pages/CheckoutPage'), 'CheckoutPage');
const OrderConfirmationPage = page(() => import('./pages/OrderConfirmationPage'), 'OrderConfirmationPage');
const LoginPage = page(() => import('./pages/AuthPages'), 'LoginPage');
const RecoverPasswordPage = page(() => import('./pages/AuthPages'), 'RecoverPasswordPage');
const RegisterPage = page(() => import('./pages/AuthPages'), 'RegisterPage');
const AccountPage = page(() => import('./pages/AccountPage'), 'AccountPage');
const TrackOrderPage = page(() => import('./pages/TrackOrderPage'), 'TrackOrderPage');
const ReturnsPortalPage = page(() => import('./pages/ReturnsPortalPage'), 'ReturnsPortalPage');
const ContactPage = page(() => import('./pages/SupportPages'), 'ContactPage');
const FaqPage = page(() => import('./pages/SupportPages'), 'FaqPage');
const BranchesPage = page(() => import('./pages/BranchesPage'), 'BranchesPage');
const AboutPage = page(() => import('./pages/EditorialPages'), 'AboutPage');
const BlogHubPage = page(() => import('./pages/EditorialPages'), 'BlogHubPage');
const BlogPostPage = page(() => import('./pages/EditorialPages'), 'BlogPostPage');
const CampaignPage = page(() => import('./pages/EditorialPages'), 'CampaignPage');
const LookbookPage = page(() => import('./pages/LookbookPage'), 'LookbookPage');
const CustomStudioPage = page(() => import('./pages/CustomStudioPage'), 'CustomStudioPage');
const BootFinderPage = page(() => import('./pages/BootFinderPage'), 'BootFinderPage');
const MaintenancePage = page(() => import('./pages/PolicyAndSystemPages'), 'MaintenancePage');
const NotFoundPage = page(() => import('./pages/PolicyAndSystemPages'), 'NotFoundPage');
const PolicyPage = page(() => import('./pages/PolicyAndSystemPages'), 'PolicyPage');
const SitemapPage = page(() => import('./pages/PolicyAndSystemPages'), 'SitemapPage');
const SystemHealthDashboard = page(() => import('../backend/components/SystemHealthDashboard'), 'SystemHealthDashboard');
const AdminDashboardPage = page(() => import('./pages/AdminDashboardPage'), 'AdminDashboardPage');

/** Shown for the moment a page's code is downloading. */
function PageLoading() {
  return (
    <div role="status" className="mx-auto flex min-h-[60vh] max-w-[1440px] items-center justify-center px-4">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#1B1E1B]/15 border-t-[#1B1E1B] motion-reduce:animate-none" />
      <span className="sr-only">Loading page</span>
    </div>
  );
}

function getRouteTransitionKey(route: ReturnType<typeof useStore>['route']): string {
  switch (route.page) {
    case 'shop':
      return `shop-${route.collectionSlug ?? 'all'}`;
    case 'product':
      return `product-${route.slug}`;
    case 'brand':
      return `brand-${route.slug}`;
    case 'search':
      return `search-${route.query}`;
    case 'account':
      return `account-${route.section ?? 'overview'}`;
    case 'blog-post':
      return `blog-${route.slug}`;
    case 'campaign':
      return `campaign-${route.slug}`;
    case 'policy':
      return `policy-${route.slug}`;
    case 'admin':
      return `admin-${route.tab ?? 'overview'}`;
    default:
      return route.page;
  }
}

function StoreRouter() {
  const { route, navigate } = useStore();
  const prefersReducedMotion = useReducedMotion();
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  useEffect(() => {
    const onQuotaExceeded = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  const routeKey = getRouteTransitionKey(route);
  const usesOwnSkeletonReveal =
    route.page === 'shop' || route.page === 'product';

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F2EC] text-[#0E1113]">
      {mapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}
      <Navbar />
      <main className="flex-1">
        <motion.div
          key={routeKey}
          initial={
            prefersReducedMotion || usesOwnSkeletonReveal
              ? false
              : { opacity: 0, y: 6 }
          }
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        >
          <Suspense fallback={<PageLoading />}>
          {/* 1. Storefront & Discovery */}
          {route.page === 'home' && <HomePage />}
          {route.page === 'shop' && <ShopPage collectionSlug={route.collectionSlug} />}
          {route.page === 'brand' && <BrandPage slug={route.slug} />}
          {route.page === 'search' && <SearchResultsPage query={route.query} />}

          {/* 2. Product & Conversion */}
          {route.page === 'product' && <ProductDetailPage slug={route.slug} />}
          {route.page === 'gift-card' && <GiftCardPage />}
          {route.page === 'cart' && <CartPage />}
          {route.page === 'checkout' && <CheckoutPage />}
          {route.page === 'thank-you' && <OrderConfirmationPage orderId={route.orderId} />}

          {/* 3. Customer Account & Self-Service */}
          {route.page === 'login' && <LoginPage />}
          {route.page === 'register' && <RegisterPage />}
          {route.page === 'recover' && <RecoverPasswordPage />}
          {route.page === 'account' && (
            <AccountPage section={route.section} orderId={route.orderId} />
          )}

          {/* 4. Post-Purchase & Support */}
          {route.page === 'orders' && (
            <TrackOrderPage
              initialOrderId={route.orderId}
              initialEmail={route.email}
            />
          )}
          {route.page === 'returns' && <ReturnsPortalPage />}
          {route.page === 'faq' && <FaqPage />}
          {route.page === 'contact' && <ContactPage />}
          {route.page === 'branches' && <BranchesPage />}

          {/* 5. Brand, Editorial & Signature Studios */}
          {route.page === 'about' && <AboutPage />}
          {route.page === 'blog' && <BlogHubPage />}
          {route.page === 'blog-post' && <BlogPostPage slug={route.slug} />}
          {route.page === 'campaign' && <CampaignPage slug={route.slug} />}
          {route.page === 'lookbooks' && <LookbookPage />}
          {route.page === 'custom-studio' && (
            <CustomStudioPage initialSlug={route.productSlug} />
          )}
          {route.page === 'boot-finder' && <BootFinderPage />}

          {/* 6. Legal & Compliance */}
          {route.page === 'policy' && <PolicyPage slug={route.slug} />}

          {/* 7. System, Utility & SEO */}
          {route.page === 'not-found' && (
            <NotFoundPage attemptedPath={route.attemptedPath} />
          )}
          {route.page === 'maintenance' && <MaintenancePage />}
          {route.page === 'sitemap' && <SitemapPage />}
          {route.page === 'system-health' && (
            <SystemHealthDashboard onBackToStore={() => navigate({ page: 'home' })} />
          )}
          {route.page === 'admin' && <AdminDashboardPage initialTab={route.tab} />}
          </Suspense>
        </motion.div>
      </main>
      <Footer />

      {/* Global Interactive Overlays & Compliance */}
      <CartDrawer />
      <WishlistDrawer />
      <SearchModal />
      <SizeGuideModal />
      <ProductQuickViewModal />
      {route.page !== 'system-health' && route.page !== 'admin' && (
        <CookieConsentBanner />
      )}
      {route.page !== 'system-health' && <ToastContainer />}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <StoreRouter />
    </StoreProvider>
  );
}
