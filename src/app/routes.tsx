import type { RouteObject } from 'react-router';
import { NotFoundPage } from '../features/shell/NotFoundPage';
import { Placeholder } from '../features/shell/Placeholder';
import { CheckoutLayout } from './layouts/CheckoutLayout';
import { StoreLayout } from './layouts/StoreLayout';
import { RootBoundary } from './RootBoundary';

const page = (path: string, title: string): RouteObject => ({ path, element: <Placeholder title={title} /> });

export const routes: RouteObject[] = [
  {
    element: <RootBoundary />,
    children: [
      {
        element: <StoreLayout />,
        children: [
          { index: true, element: <Placeholder title="Sport Castle" /> },
          page('shop', 'Shop all'),
          page('c/:category', 'Category'),
          page('collections/:slug', 'Collection'),
          page('brands/:slug', 'Brand'),
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
