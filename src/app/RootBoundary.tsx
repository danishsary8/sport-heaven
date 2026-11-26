import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';

/** Old links from the previous site used hash routing ("/#/products/slug"): send them to the new pages. */
export function legacyHashTarget(hash: string): string | null {
  if (!hash.startsWith('#/')) return null;
  const product = /^#\/products?\/([a-z0-9-]+)/i.exec(hash);
  return product ? `/p/${product[1]!.toLowerCase()}` : '/';
}

export function RootBoundary() {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const target = legacyHashTarget(location.hash);
    if (target) void navigate(target, { replace: true });
  }, [location.hash, navigate]);
  return <Outlet />;
}
