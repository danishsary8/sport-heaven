import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { legacyHashTarget } from './legacyHash';

export function RootBoundary() {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const target = legacyHashTarget(location.hash);
    if (target) void navigate(target, { replace: true });
  }, [location.hash, navigate]);
  return <Outlet />;
}
