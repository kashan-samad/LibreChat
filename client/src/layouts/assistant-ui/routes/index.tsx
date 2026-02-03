import type { RouteObject } from 'react-router-dom';
import EnterpriseSearch from './EnterpriseSearch';

/**
 * Routes specific to the assistant-ui layout
 * These routes will be automatically discovered and merged into the main router
 * 
 * IMPORTANT: Export name must follow the pattern: <layoutName>Routes
 * where layoutName is the folder name with hyphens removed and camelCased
 * Example: 'assistant-ui' -> 'assistantUIRoutes'
 * 
 * Routes defined here will only be accessible when the layout is set to 'assistant-ui'
 * in the startup configuration (interface.layout)
 */
export const assistantUIRoutes: RouteObject[] = [
  {
    path: 'enterprise-search',
    element: <EnterpriseSearch />,
  },
];
