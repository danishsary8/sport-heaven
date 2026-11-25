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
import { ShopPage } from './pages/ShopPage';
import { BrandPage } from './pages/BrandPage';
import { SearchResultsPage } from './pages/SearchResultsPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { GiftCardPage } from './pages/GiftCardPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { LoginPage, RecoverPasswordPage, RegisterPage } from './pages/AuthPages';
import { AccountPage } from './pages/AccountPage';
import { TrackOrderPage } from './pages/TrackOrderPage';
import { ReturnsPortalPage } from './pages/ReturnsPortalPage';
import { ContactPage, FaqPage } from './pages/SupportPages';
import { BranchesPage } from './pages/BranchesPage';
import {
  AboutPage,
  BlogHubPage,
  BlogPostPage,
  CampaignPage,
} from './pages/EditorialPages';
import { LookbookPage } from './pages/LookbookPage';
import { CustomStudioPage } from './pages/CustomStudioPage';
import { BootFinderPage } from './pages/BootFinderPage';
import {
  MaintenancePage,
  NotFoundPage,
  PolicyPage,
  SitemapPage,
} from './pages/PolicyAndSystemPages';
import { SystemHealthDashboard } from './components/admin/SystemHealthDashboard';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

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
  const routeKey = getRouteTransitionKey(route);
  const usesOwnSkeletonReveal =
    route.page === 'shop' || route.page === 'product';

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F2EC] text-[#0E1113]">
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
