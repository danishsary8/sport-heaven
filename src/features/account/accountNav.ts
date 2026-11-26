/** The member area's pages (in menu order) and signing out back to the home page. */

import { useNavigate } from 'react-router';
import { useAuth } from '../../lib/auth';
import type { DictKey } from '../../lib/i18n';

export const ACCOUNT_LINKS: [string, DictKey][] = [
  ['/account', 'acc.nav.overview'],
  ['/account/orders', 'acc.nav.orders'],
  ['/account/returns', 'acc.nav.returns'],
  ['/account/wishlist', 'acc.nav.wishlist'],
  ['/account/points', 'acc.nav.points'],
  ['/account/addresses', 'acc.nav.addresses'],
  ['/account/profile', 'acc.nav.profile'],
];

/** Signs out, then goes home (replacing the history entry so Back does not return to the account). */
export function useSignOutHome() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  return async () => {
    await signOut();
    void navigate('/', { replace: true });
  };
}
