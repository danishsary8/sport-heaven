import { useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../lib/auth';
import { useI18n, type DictKey } from '../../lib/i18n';
import { Skeleton, cx } from '../../ui';

export const ACCOUNT_LINKS: [string, DictKey][] = [
  ['/account', 'acc.nav.overview'],
  ['/account/orders', 'acc.nav.orders'],
  ['/account/returns', 'acc.nav.returns'],
  ['/account/wishlist', 'acc.nav.wishlist'],
  ['/account/points', 'acc.nav.points'],
  ['/account/addresses', 'acc.nav.addresses'],
  ['/account/profile', 'acc.nav.profile'],
];

export function useSignOutHome() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  return async () => {
    await signOut();
    void navigate('/', { replace: true });
  };
}

/** Members only: guests go to sign in and come back here afterwards. */
export function AccountLayout() {
  const { t } = useI18n();
  const { status } = useAuth();
  const location = useLocation();
  const signOut = useSignOutHome();
  // A member who signs out (or deletes the account) here goes home, not to the sign-in page.
  const [wasMember, setWasMember] = useState(false);
  if (status === 'member' && !wasMember) setWasMember(true);
  if (status === 'loading') return <Skeleton className="mx-auto my-10 h-64 max-w-[1120px]" />;
  if (status === 'guest') return wasMember ? <Navigate to="/" replace /> : <Navigate to="/sign-in" replace state={{ from: location.pathname + location.search }} />;
  return (
    <div className="mx-auto max-w-[1120px] px-4 pb-16 pt-6 lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-12 lg:px-8 lg:pt-10">
      <nav aria-label={t('acc.nav')} className="hidden lg:block">
        <ul className="flex flex-col gap-1">
          {ACCOUNT_LINKS.map(([to, key]) => (
            <li key={to}>
              <NavLink to={to} end={to === '/account'} className={({ isActive }) => cx('block rounded-[6px] px-3 py-2 font-medium hover:bg-stone', isActive && 'bg-stone font-semibold')}>
                {t(key)}
              </NavLink>
            </li>
          ))}
          <li className="mt-4 border-t border-stone pt-4">
            <button type="button" onClick={() => void signOut()} className="w-full rounded-[6px] px-3 py-2 text-left font-medium text-graphite hover:bg-stone hover:text-obsidian">
              {t('acc.signOut')}
            </button>
          </li>
        </ul>
      </nav>
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
