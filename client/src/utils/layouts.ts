// import type { Resource } from 'i18next';
import { Navigate } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import React, { ComponentType, lazy, LazyExoticComponent, Suspense } from 'react';
import type { TStartupConfig } from 'librechat-data-provider';

/**
 * Eagerly load all component modules for layout resolution
 */
const layoutComponents = import.meta.glob<{ default: ComponentType<any> }>(
  '/src/layouts/**/components/**/*.{tsx,ts}',
  { eager: false },
);

// Cache for dynamically loaded components to avoid re-importing
const componentCache = new Map<string, LazyExoticComponent<ComponentType<any>>>();

/**
 * Fetches the layout name from startup config
 * @param startupConfig
 * @returns string - layout name
 */
export const getLayoutName = (startupConfig?: TStartupConfig): string => {
  return startupConfig?.interface?.customLayout ?? '';
};

/**
 * Hook to dynamically load a component based on the current layout from config
 * @param componentPath - Path relative to components/ (e.g., 'Nav/Nav')
 * @param currentLayout - Current layout from startup config
 * @param defaultComponent - Default component to use if no layout-specific version exists
 * @returns A lazy-loaded React component
 *
 * @example
 * const Nav = useLayoutComponent('Nav/Nav', layout);
 * return <Suspense fallback={<Loading />}><Nav {...props} /></Suspense>;
 */
export function useLayoutComponent<T = any>(
  componentPath: string,
  currentLayout: string = '',
  defaultComponent: ComponentType<T>,
): LazyExoticComponent<ComponentType<T>> | ComponentType<T> {
  return React.useMemo(() => {
    const LazyComponent = createLayoutComponent<T>(componentPath, currentLayout, defaultComponent);

    return ((props: any) =>
      React.createElement(
        Suspense,
        {
          fallback: React.createElement('div', { className: 'h-full w-64 bg-surface-primary-alt' }),
        },
        React.createElement(LazyComponent as React.ComponentType<any>, props),
      )) as any;
  }, [componentPath, currentLayout, defaultComponent]);
}

/**
 * Creates a lazy-loaded component that automatically resolves based on layout
 * @param componentPath - Path relative to components/ (e.g., 'Nav/Nav')
 * @param currentLayout - Current layout from startup config
 * @param defaultComponent - Default component to use if no layout-specific version exists
 * @returns A lazy-loaded React component
 */
function createLayoutComponent<T = any>(
  componentPath: string,
  currentLayout: string = '',
  defaultComponent: ComponentType<T>,
): LazyExoticComponent<ComponentType<T>> {
  if (currentLayout === '' && defaultComponent)
    return defaultComponent as LazyExoticComponent<ComponentType<T>>;

  const cacheKey = `${currentLayout}:${componentPath}`;

  // Return cached component if exists
  if (componentCache.has(cacheKey)) {
    return componentCache.get(cacheKey) as LazyExoticComponent<ComponentType<T>>;
  }

  const importFn = resolveComponentPath(componentPath, currentLayout);

  if (!importFn) {
    if (defaultComponent) return defaultComponent as LazyExoticComponent<ComponentType<T>>;

    throw new Error(
      `Component not found: ${componentPath} (currentLayout: ${currentLayout}). ` +
        `Make sure the component exists in either /src/components/${componentPath}.tsx ` +
        `or /src/layouts/${currentLayout}/components/${componentPath}.tsx`,
    );
  }

  const LazyComponent = lazy(importFn);
  componentCache.set(cacheKey, LazyComponent);

  return LazyComponent as LazyExoticComponent<ComponentType<T>>;
} /**
 * Resolves the correct component path based on the layout
 * @param componentPath - Path relative to components/ (e.g., 'Nav/Nav' or 'Chat/Header')
 * @param currentLayout - Current layout from startup config
 * @returns The resolved import function or null if not found
 */
function resolveComponentPath(
  componentPath: string,
  currentLayout: string = '',
): (() => Promise<{ default: ComponentType<any> }>) | null {
  // Normalize the path
  const normalizedPath = componentPath.replace(/^\/+|\/+$/g, '');

  // Try layout-specific component first
  const layoutPath = `/src/layouts/${currentLayout}/components/${normalizedPath}.tsx`;
  if (layoutComponents[layoutPath]) {
    return layoutComponents[layoutPath];
  }

  // Try .ts extension
  const layoutPathTs = `/src/layouts/${currentLayout}/components/${normalizedPath}.ts`;
  if (layoutComponents[layoutPathTs]) {
    return layoutComponents[layoutPathTs];
  }

  return null;
}

/**
 * Gets a layout constant/export from the chosen layout
 * @param componentPath - Path relative to components/ (e.g., 'Nav')
 * @param exportName - Name of the export to retrieve (e.g., 'NAV_WIDTH')
 * @param currentLayout - Current layout from startup config
 * @param defaultValue - Default value if layout-specific export doesn't exist
 * @returns The exported value from the layout or the default value
 */
export async function getLayoutExport<T = any>(
  componentPath: string,
  exportName: string,
  currentLayout: string = '',
  defaultValue: T,
): Promise<T> {
  if (currentLayout === '') {
    return defaultValue;
  }

  const normalizedPath = componentPath.replace(/^\/+|\/+$/g, '');

  // Try to import from the layout's index file first (recommended approach)
  const indexPath = `/src/layouts/${currentLayout}/components/${normalizedPath}/index.ts`;
  if (layoutComponents[indexPath]) {
    try {
      const module = await layoutComponents[indexPath]();
      return (module as any)[exportName] ?? defaultValue;
    } catch (error) {
      console.warn(`Failed to load ${exportName} from ${indexPath}:`, error);
      return defaultValue;
    }
  }

  // Fallback to the component file directly
  const componentFilePath = `/src/layouts/${currentLayout}/components/${normalizedPath}/${normalizedPath.split('/').pop()}.tsx`;
  if (layoutComponents[componentFilePath]) {
    try {
      const module = await layoutComponents[componentFilePath]();
      return (module as any)[exportName] ?? defaultValue;
    } catch (error) {
      console.warn(`Failed to load ${exportName} from ${componentFilePath}:`, error);
      return defaultValue;
    }
  }

  return defaultValue;
}

/**
 * Wrapper component that conditionally renders a layout-specific route
 * Redirects to home if the current layout doesn't match the required layout
 */
export function LayoutRoute({
  requiredLayout,
  children,
  currentLayout = '',
}: {
  requiredLayout: string;
  children?: React.ReactNode;
  currentLayout?: string;
}) {
  // If the current layout matches the required layout, render the children
  if (currentLayout === requiredLayout) {
    return React.createElement(React.Fragment, null, children);
  }

  // Otherwise, redirect to home
  return React.createElement(Navigate, { to: '/c/new', replace: true });
}

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
    // Look for exported routes with naming convention: assistantUIRoutes, abcdRoutes, etc.
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

export function addLayoutRoutes() {
  // Layout-specific routes are added dynamically below
  return Object.entries({ ...layoutRoutesMap }).flatMap(([layoutName, routes]) =>
    routes.map((route) => ({
      ...route,
      element: route.element
        ? React.createElement(LayoutRoute, { requiredLayout: layoutName }, route.element)
        : null,
    })),
  );
}
