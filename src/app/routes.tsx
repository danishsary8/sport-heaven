import type { RouteObject } from 'react-router';
import { lazy } from 'react';
import { HomePage } from '../features/catalog/home/HomePage';
import { NotFoundPage } from '../features/shell/NotFoundPage';
import { Placeholder } from '../features/shell/Placeholder';
import { CheckoutLayout } from './layouts/CheckoutLayout';
import { StoreLayout } from './layouts/StoreLayout';
import { RootBoundary } from './RootBoundary';
import { RouteError } from './PageFallback';

const Listing = (name: 'ShopPage' | 'CategoryPage' | 'BrandPage' | 'CollectionPage') =>
  lazy(() => import('../features/catalog/listing/ListingPages').then((m) => ({ default: m[name] })));
const ShopPage = Listing('ShopPage');
const CategoryPage = Listing('CategoryPage');
const BrandPage = Listing('BrandPage');
const CollectionPage = Listing('CollectionPage');

const SearchPage = lazy(() => import('../features/catalog/search/SearchPage').then((m) => ({ default: m.SearchPage })));

const ProductPage = lazy(() => import('../features/catalog/product/ProductPage').then((m) => ({ default: m.ProductPage })));

const CustomPage = lazy(() => import('../features/catalog/print/CustomPage').then((m) => ({ default: m.CustomPage })));

const page = (path: string, title: string): RouteObject => ({ path, element: <Placeholder title={title} /> });

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
          page('bag', 'Your bag'),
          page('order/:number', 'Your order'),
          page('track', 'Track an order'),
          page('sign-in', 'Sign in'),
          page('account/*', 'Your account'),
          page('stores', 'Our stores'),
          page('help/*', 'Help'),
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      {
        element: <CheckoutLayout />,
        children: [page('checkout', 'Checkout'), page('pay/:number', 'Pay')],
      },
      page('admin/*', 'Admin'),
    ],
  },
];
