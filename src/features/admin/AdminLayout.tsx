import { ArrowLeft } from 'lucide-react';
import { Suspense } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router';
import { PageFallback } from '../../app/PageFallback';
import { useAuth } from '../../lib/auth';
import { EmptyState, Skeleton, cx } from '../../ui';
import { Wordmark } from '../shell/Wordmark';

/** [path, label, admin only] */
export const ADMIN_LINKS: [string, string, boolean][] = [
  ['/admin', 'Overview', false],
  ['/admin/orders', 'Orders', false],
  ['/admin/stock', 'Stock', false],
  ['/admin/returns', 'Returns', false],
  ['/admin/questions', 'Questions', false],
  ['/admin/products', 'Products', true],
  ['/admin/promotions', 'Promotions', true],
  ['/admin/delivery', 'Delivery', true],
  ['/admin/settings', 'Settings', true],
  ['/admin/users', 'Users', true],
  ['/admin/health', 'Health', true],
  ['/admin/logs', 'Logs', true],
];

export function useIsAdmin(): boolean {
  return useAuth().user?.role === 'admin';
}

/** Staff and admins only. Usable on a phone at the counter: one scrolling nav row on top, a sidebar on desktop. */
export function AdminLayout() {
  const { status, user } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <Skeleton className="m-6 h-64" />;
  if (status === 'guest') return <Navigate to="/sign-in" replace state={{ from: location.pathname + location.search }} />;
  if (user?.role !== 'staff' && user?.role !== 'admin') {
    return (
      <main id="main" className="mx-auto max-w-[640px] px-4 py-16">
        <EmptyState title="This area is for staff" body="Sign in with a staff or admin account to use it." action={<Link to="/" className="font-semibold underline underline-offset-4">Back to the shop</Link>} />
      </main>
    );
  }
  const admin = user.role === 'admin';
  const links = ADMIN_LINKS.filter(([, , adminOnly]) => admin || !adminOnly);
  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
      <header className="sticky top-0 z-30 border-b border-stone bg-paper lg:static lg:h-dvh lg:border-b-0 lg:border-r">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <Wordmark />
          <Link to="/" className="inline-flex items-center gap-1 text-sm font-semibold text-graphite hover:text-obsidian lg:hidden">
            <ArrowLeft className="size-4" aria-hidden />
            Shop
          </Link>
        </div>
        <nav aria-label="Admin" className="overflow-x-auto px-2 pb-2 lg:px-3">
          <ul className="flex gap-1 lg:flex-col">
            {links.map(([to, label]) => (
              <li key={to} className="shrink-0">
                <NavLink to={to} end={to === '/admin'} className={({ isActive }) => cx('block whitespace-nowrap rounded-[6px] px-3 py-2 text-[15px] font-medium hover:bg-stone', isActive && 'bg-obsidian text-paper hover:bg-obsidian')}>
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="hidden px-6 pt-4 text-sm text-graphite lg:block">
          <p>{user.fullName ?? user.phone}</p>
          <p className="capitalize">{user.role}{user.staffBranchId ? `, ${user.staffBranchId}` : ''}</p>
          <Link to="/" className="mt-3 inline-flex items-center gap-1 font-semibold hover:text-obsidian">
            <ArrowLeft className="size-4" aria-hidden />
            Back to the shop
          </Link>
        </div>
      </header>
      <main id="main" className="min-w-0 px-4 pb-16 pt-5 lg:px-8 lg:pt-8">
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

/** Admin-only pages render this for staff who follow an old link. */
export function AdminOnly({ children }: { children: React.ReactNode }) {
  const admin = useIsAdmin();
  return admin ? <>{children}</> : <EmptyState title="Only admins can use this page" body="Ask an admin if you need a change here." />;
}
