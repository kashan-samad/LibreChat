import type { RouteObject } from 'react-router-dom';
import EnterpriseSearch from './EnterpriseSearch';

/**
 * Routes specific to the trivago-ui layout
 * These routes will be automatically discovered and merged into the main router
 *
 * IMPORTANT: Export name must follow the pattern: <layoutName>Routes
 * where layoutName is the folder name with hyphens removed and camelCased
 * Example: 'trivago-ui' -> 'trivagoUIRoutes'
 */
export const trivagoUIRoutes: RouteObject[] = [
  {
    path: 'enterprise-search',
    element: <EnterpriseSearch />,
  },
];
