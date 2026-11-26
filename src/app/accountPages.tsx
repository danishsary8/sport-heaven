import { lazy } from 'react';

/** Account pages load together (one small chunk) on first visit to /account. */
const load = () => import('../features/account/pages');
const PAGES = {
  OverviewPage: lazy(() => load().then((m) => ({ default: m.OverviewPage }))),
  ProfilePage: lazy(() => load().then((m) => ({ default: m.ProfilePage }))),
  AddressesPage: lazy(() => load().then((m) => ({ default: m.AddressesPage }))),
  MyOrdersPage: lazy(() => load().then((m) => ({ default: m.MyOrdersPage }))),
  MyOrderPage: lazy(() => load().then((m) => ({ default: m.MyOrderPage }))),
  MyReturnsPage: lazy(() => load().then((m) => ({ default: m.MyReturnsPage }))),
  NewReturnPage: lazy(() => load().then((m) => ({ default: m.NewReturnPage }))),
  WishlistPage: lazy(() => load().then((m) => ({ default: m.WishlistPage }))),
  PointsPage: lazy(() => load().then((m) => ({ default: m.PointsPage }))),
};

export function AccountPage({ name }: { name: keyof typeof PAGES }) {
  const Page = PAGES[name];
  return <Page />;
}
