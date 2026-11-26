import { lazy } from 'react';
import type { RouteObject } from 'react-router';
import { NotFoundPage } from '../shell/NotFoundPage';
import { AdminLayout, AdminOnly } from './AdminLayout';

const pages = () => import('./pages');
const page = <K extends keyof Awaited<ReturnType<typeof pages>>>(name: K) => lazy(() => pages().then((m) => ({ default: m[name] as React.ComponentType })));

const OverviewPage = page('OverviewPage');
const AdminOrdersPage = page('AdminOrdersPage');
const AdminOrderPage = page('AdminOrderPage');

/** /admin and its pages. The layout and pages are one lazy chunk, loaded only by staff. */
export const adminRoutes: RouteObject = {
  path: 'admin',
  element: <AdminLayout />,
  children: [
    { index: true, element: <OverviewPage /> },
    { path: 'orders', element: <AdminOrdersPage /> },
    { path: 'orders/:number', element: <AdminOrderPage /> },
    { path: '*', element: <NotFoundPage /> },
  ],
};

export { AdminOnly };
