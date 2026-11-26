import type { RouteObject } from 'react-router';
import { lazy } from 'react';
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

const page = (path: string, title: string): RouteObject => ({ path, element: <Placeholder title={title} /> });

export const routes: RouteObject[] = [
  {
    element: <RootBoundary />,
    errorElement: <RouteError />,
    children: [
      {
        element: <StoreLayout />,
        children: [
          { index: true, element: <Placeholder title="Sport Castle" /> },
          { path: 'shop', element: <ShopPage /> },
          { path: 'c/:category', element: <CategoryPage /> },
          { path: 'collections/:slug', element: <CollectionPage /> },
          { path: 'brands/:slug', element: <BrandPage /> },
          page('custom', 'Print your shirt'),
          page('search', 'Search'),
          page('p/:slug', 'Product'),
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
