import type { RouteObject } from 'react-router-dom';

/**
 * Dynamically imports routes from a layout
 * Uses dynamic import to avoid bundling all layout routes upfront
 */
// async function importLayoutRoutes(layout: string): Promise<RouteObject[]> {
//   try {
//     const module = await import(`~/layouts/${layout}/routes/index.tsx`);
//     return module[`${layout.replace(/-/g, '')}Routes`] || [];
//   } catch (error) {
//     console.log(`No routes found for layout: ${layout}`);
//     return [];
//   }
// }

/**
 * Gets all available layout routes by checking what layouts exist
 * This uses Vite's import.meta.glob to discover layouts at build time
 */
const layoutRouteModules = import.meta.glob<{
  [key: string]: RouteObject[];
}>('/src/layouts/*/routes/index.tsx', { eager: true });

/**
 * Map of layout names to their routes (eagerly loaded for initial render)
 */
const layoutRoutesMap: Record<string, RouteObject[]> = {};

// Populate the map from discovered modules
Object.keys(layoutRouteModules).forEach((path) => {
  // Extract layout name from path: /src/layouts/assistant-ui/routes/index.tsx -> assistant-ui
  const match = path.match(/\/layouts\/([^/]+)\/routes/);
  if (match) {
    const layoutName = match[1];
    const module = layoutRouteModules[path];
    // Look for exported routes with naming convention
    const routesKey = Object.keys(module).find((key) => key.endsWith('Routes'));
    if (routesKey) {
      layoutRoutesMap[layoutName] = module[routesKey] as RouteObject[];
    }
  }
});

/**
 * Gets routes for a specific layout
 * @param layout - Layout name (e.g., 'assistant-ui')
 * @returns Array of route objects for the layout, or empty array if none
 */
export function getLayoutRoutes(layout: string): RouteObject[] {
  return layoutRoutesMap[layout] || [];
}

/**
 * Gets all available layout routes
 * Useful for debugging or displaying available layouts
 */
export function getAllLayoutRoutes(): Record<string, RouteObject[]> {
  return { ...layoutRoutesMap };
}
