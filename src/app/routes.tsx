import type { RouteObject } from 'react-router';
import { lazy } from 'react';
import { HomePage } from '../features/catalog/home/HomePage';
import { NotFoundPage } from '../features/shell/NotFoundPage';
import { CheckoutLayout } from './layouts/CheckoutLayout';
import { StoreLayout } from './layouts/StoreLayout';
import { RootBoundary } from './RootBoundary';
import { RouteError } from './PageFallback';
import { AccountPage } from './accountPages';

const Listing = (name: 'ShopPage' | 'CategoryPage' | 'BrandPage' | 'CollectionPage') =>
  lazy(() => import('../features/catalog/listing/ListingPages').then((m) => ({ default: m[name] })));
const ShopPage = Listing('ShopPage');
const CategoryPage = Listing('CategoryPage');
const BrandPage = Listing('BrandPage');
const CollectionPage = Listing('CollectionPage');

const SearchPage = lazy(() => import('../features/catalog/search/SearchPage').then((m) => ({ default: m.SearchPage })));

const ProductPage = lazy(() => import('../features/catalog/product/ProductPage').then((m) => ({ default: m.ProductPage })));

const CustomPage = lazy(() => import('../features/catalog/print/CustomPage').then((m) => ({ default: m.CustomPage })));

const pages = () => import('../features/pages/HelpPages');
const HelpIndexPage = lazy(() => pages().then((m) => ({ default: m.HelpIndexPage })));
const HelpTopicPage = lazy(() => pages().then((m) => ({ default: m.HelpTopicPage })));
const StoresPage = lazy(() => import('../features/pages/StoresPage').then((m) => ({ default: m.StoresPage })));

const BagPage = lazy(() => import('../features/cart/BagPage').then((m) => ({ default: m.BagPage })));

const CheckoutPage = lazy(() => import('../features/checkout/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));

const PayPage = lazy(() => import('../features/payment/PayPage').then((m) => ({ default: m.PayPage })));

const OrderPage = lazy(() => import('../features/orders/OrderPage').then((m) => ({ default: m.OrderPage })));
const TrackPage = lazy(() => import('../features/orders/TrackPage').then((m) => ({ default: m.TrackPage })));

const SignInPage = lazy(() => import('../features/account/SignInPage').then((m) => ({ default: m.SignInPage })));

const AccountLayout = lazy(() => import('../features/account/AccountLayout').then((m) => ({ default: m.AccountLayout })));

const AdminRoot = lazy(() => import('../features/admin/AdminRoot').then((m) => ({ default: m.AdminRoot })));

export const routes: RouteObject[] = [
  {
    element: <RootBoundary />,
    errorElement: <RouteError />,
    children: [
      {
        element: <StoreLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'shop', element: <ShopPage /> },
          { path: 'c/:category', element: <CategoryPage /> },
          { path: 'collections/:slug', element: <CollectionPage /> },
          { path: 'brands/:slug', element: <BrandPage /> },
          { path: 'custom', element: <CustomPage /> },
          { path: 'search', element: <SearchPage /> },
          { path: 'p/:slug', element: <ProductPage /> },
          { path: 'bag', element: <BagPage /> },
          { path: 'order/:number', element: <OrderPage /> },
          { path: 'track', element: <TrackPage /> },
          { path: 'sign-in', element: <SignInPage /> },
          {
            path: 'account',
            element: <AccountLayout />,
            children: [
              { index: true, element: <AccountPage name="OverviewPage" /> },
              { path: 'profile', element: <AccountPage name="ProfilePage" /> },
              { path: 'addresses', element: <AccountPage name="AddressesPage" /> },
              { path: 'orders', element: <AccountPage name="MyOrdersPage" /> },
              { path: 'orders/:number', element: <AccountPage name="MyOrderPage" /> },
              { path: 'returns', element: <AccountPage name="MyReturnsPage" /> },
              { path: 'returns/new', element: <AccountPage name="NewReturnPage" /> },
              { path: 'wishlist', element: <AccountPage name="WishlistPage" /> },
              { path: 'points', element: <AccountPage name="PointsPage" /> },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
          { path: 'stores', element: <StoresPage /> },
          { path: 'help', element: <HelpIndexPage /> },
          { path: 'help/:topic', element: <HelpTopicPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      {
        element: <CheckoutLayout />,
        children: [{ path: 'checkout', element: <CheckoutPage /> }, { path: 'pay/:number', element: <PayPage /> }],
      },
      { path: 'admin/*', element: <AdminRoot /> },
    ],
  },
];
