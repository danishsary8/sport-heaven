import { Activity, ArrowLeft, BadgePercent, LayoutDashboard, MessageCircleQuestion, RotateCcw, ScrollText, Settings, Shirt, ShoppingBag, Truck, Users, Warehouse, type LucideIcon } from 'lucide-react';
import { Suspense } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router';
import { PageFallback } from '../../app/PageFallback';
import { useAuth } from '../../lib/auth';
import { EmptyState, Skeleton, cx } from '../../ui';
import { Wordmark } from '../shell/Wordmark';

type AdminLink = { to: string; label: string; adminOnly: boolean; icon: LucideIcon };

/** The admin menu, grouped by the job a person is doing. Staff see only what the counter needs. */
export const ADMIN_GROUPS: { title: string; links: AdminLink[] }[] = [
  {
    title: 'Sell',
    links: [
      { to: '/admin', label: 'Overview', adminOnly: false, icon: LayoutDashboard },
      { to: '/admin/orders', label: 'Orders', adminOnly: false, icon: ShoppingBag },
      { to: '/admin/stock', label: 'Stock', adminOnly: false, icon: Warehouse },
    ],
  },
  {
    title: 'Catalogue',
    links: [
      { to: '/admin/products', label: 'Products', adminOnly: true, icon: Shirt },
      { to: '/admin/promotions', label: 'Promotions', adminOnly: true, icon: BadgePercent },
    ],
  },
  {
    title: 'Customers',
    links: [
      { to: '/admin/returns', label: 'Returns', adminOnly: false, icon: RotateCcw },
      { to: '/admin/questions', label: 'Questions', adminOnly: false, icon: MessageCircleQuestion },
      { to: '/admin/users', label: 'Users', adminOnly: true, icon: Users },
    ],
  },
  {
    title: 'Setup',
    links: [
      { to: '/admin/delivery', label: 'Delivery', adminOnly: true, icon: Truck },
      { to: '/admin/settings', label: 'Settings', adminOnly: true, icon: Settings },
      { to: '/admin/health', label: 'Health', adminOnly: true, icon: Activity },
      { to: '/admin/logs', label: 'Logs', adminOnly: true, icon: ScrollText },
    ],
  },
];

/** [path, label, admin only], flat. */
export const ADMIN_LINKS: [string, string, boolean][] = ADMIN_GROUPS.flatMap((g) => g.links.map((l): [string, string, boolean] => [l.to, l.label, l.adminOnly]));

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
  const groups = ADMIN_GROUPS.map((g) => ({ ...g, links: g.links.filter((l) => admin || !l.adminOnly) })).filter((g) => g.links.length > 0);
  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <header className="sticky top-0 z-30 border-b border-stone bg-paper/95 backdrop-blur lg:flex lg:h-dvh lg:flex-col lg:self-start lg:border-b-0 lg:border-r lg:bg-chalk">
        <div className="flex h-14 items-center justify-between gap-3 px-4 lg:h-16 lg:px-5">
          <Wordmark />
          <span className={cx('rounded-full px-2.5 py-0.5 text-xs font-semibold', admin ? 'bg-obsidian text-paper' : 'bg-cobalt/10 text-cobalt')}>{admin ? 'Admin' : 'Staff'}</span>
        </div>
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-2 pb-2 [scrollbar-width:none] lg:flex-1 lg:flex-col lg:gap-5 lg:overflow-y-auto lg:px-3 lg:pb-4 lg:pt-2">
          {groups.map((g) => (
            <div key={g.title} className="flex shrink-0 items-center gap-1 lg:flex-col lg:items-stretch">
              <h2 className="sr-only lg:not-sr-only lg:px-3 lg:pb-1 lg:text-xs lg:font-semibold lg:text-graphite">{g.title}</h2>
              <ul className="flex gap-1 lg:flex-col">
                {g.links.map(({ to, label, icon: Icon }) => (
                  <li key={to} className="shrink-0">
                    <NavLink
                      to={to}
                      end={to === '/admin'}
                      className={({ isActive }) =>
                        cx(
                          'flex items-center gap-2.5 whitespace-nowrap rounded-[8px] px-3 py-2 text-[15px] font-medium transition-colors',
                          isActive ? 'bg-obsidian text-paper' : 'text-obsidian/80 hover:bg-stone hover:text-obsidian',
                        )
                      }
                    >
                      <Icon className="hidden size-4 shrink-0 lg:block" aria-hidden />
                      {label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="hidden border-t border-stone px-5 py-4 text-sm lg:block">
          <p className="truncate font-semibold">{user.fullName ?? user.phone}</p>
          <p className="text-graphite">{user.staffBranchId ? `Store: ${user.staffBranchId}` : 'All stores'}</p>
          <Link to="/" className="mt-3 inline-flex items-center gap-1 font-semibold text-graphite transition-colors hover:text-obsidian">
            <ArrowLeft className="size-4" aria-hidden />
            Back to the shop
          </Link>
        </div>
      </header>
      <main id="main" className="min-w-0 px-4 pb-16 pt-5 lg:px-10 lg:pt-8">
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
