import { Route, Routes } from 'react-router';
import { adminRoutes } from './routes';

function toRoute(r: import('react-router').RouteObject, key: string): React.ReactNode {
  return (
    <Route key={key} path={r.path} index={r.index as false | undefined} element={r.element}>
      {r.children?.map((c, i) => toRoute(c, `${key}.${i}`))}
    </Route>
  );
}

/** The whole admin area is one lazy chunk mounted under /admin/*. */
export function AdminRoot() {
  return <Routes>{toRoute({ ...adminRoutes, path: undefined }, 'admin')}</Routes>;
}
