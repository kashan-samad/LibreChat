import React, { ComponentType, lazy, LazyExoticComponent } from 'react';

/**
 * Dynamic component loader that automatically loads layout-specific components
 * if they exist, otherwise falls back to the default component.
 *
 * This uses Vite's import.meta.glob for efficient code-splitting and build-time resolution.
 */

// Eagerly load all component modules for layout resolution
// This creates a map of all possible component paths
const defaultComponents = import.meta.glob<{ default: ComponentType<any> }>(
  '/src/components/**/*.{tsx,ts}',
  { eager: false },
);

const layoutComponents = import.meta.glob<{ default: ComponentType<any> }>(
  '/src/layouts/**/components/**/*.{tsx,ts}',
  { eager: false },
);

/**
 * Component cache to avoid re-creating lazy components
 */
const componentCache = new Map<string, LazyExoticComponent<ComponentType<any>>>();

/**
 * Resolves the correct component path based on the layout
 * @param componentPath - Path relative to components/ (e.g., 'Nav/Nav' or 'Chat/Header')
 * @param layout - Layout name (e.g., 'assistant-ui')
 * @returns The resolved import function or null if not found
 */
function resolveComponentPath(
  componentPath: string,
  layout: string,
): (() => Promise<{ default: ComponentType<any> }>) | null {
  // Normalize the path
  const normalizedPath = componentPath.replace(/^\/+|\/+$/g, '');

  if (layout && layout !== 'default') {
    // Try layout-specific component first
    const layoutPath = `/src/layouts/${layout}/components/${normalizedPath}.tsx`;
    if (layoutComponents[layoutPath]) {
      return layoutComponents[layoutPath];
    }

    // Try .ts extension
    const layoutPathTs = `/src/layouts/${layout}/components/${normalizedPath}.ts`;
    if (layoutComponents[layoutPathTs]) {
      return layoutComponents[layoutPathTs];
    }
  }

  // Fallback to default component
  const defaultPath = `/src/components/${normalizedPath}.tsx`;
  if (defaultComponents[defaultPath]) {
    return defaultComponents[defaultPath];
  }

  // Try .ts extension
  const defaultPathTs = `/src/components/${normalizedPath}.ts`;
  if (defaultComponents[defaultPathTs]) {
    return defaultComponents[defaultPathTs];
  }

  return null;
}

/**
 * Creates a lazy-loaded component that automatically resolves based on layout
 * @param componentPath - Path relative to components/ (e.g., 'Nav/Nav')
 * @param layout - Layout name (e.g., 'assistant-ui')
 * @returns A lazy-loaded React component
 */
export function createLayoutComponent<T = any>(
  componentPath: string,
  layout: string = 'default',
): LazyExoticComponent<ComponentType<T>> {
  const cacheKey = `${layout}:${componentPath}`;

  // Return cached component if exists
  if (componentCache.has(cacheKey)) {
    return componentCache.get(cacheKey) as LazyExoticComponent<ComponentType<T>>;
  }

  const importFn = resolveComponentPath(componentPath, layout);

  if (!importFn) {
    throw new Error(
      `Component not found: ${componentPath} (layout: ${layout}). ` +
        `Make sure the component exists in either /src/components/${componentPath}.tsx ` +
        `or /src/layouts/${layout}/components/${componentPath}.tsx`,
    );
  }

  const LazyComponent = lazy(importFn);
  componentCache.set(cacheKey, LazyComponent);

  return LazyComponent as LazyExoticComponent<ComponentType<T>>;
}

/**
 * Hook to dynamically load a component based on the current layout from config
 * @param componentPath - Path relative to components/ (e.g., 'Nav/Nav')
 * @param currentLayout - Current layout from startup config
 * @returns A lazy-loaded React component
 *
 * @example
 * const Nav = useLayoutComponent('Nav/Nav', layout);
 * return <Suspense fallback={<Loading />}><Nav {...props} /></Suspense>;
 */
export function useLayoutComponent<T = any>(
  componentPath: string,
  currentLayout: string = 'default',
): LazyExoticComponent<ComponentType<T>> {
  return React.useMemo(
    () => createLayoutComponent<T>(componentPath, currentLayout),
    [componentPath, currentLayout],
  );
}

/**
 * Higher-order component wrapper that automatically handles Suspense and layout resolution
 * @param componentPath - Path relative to components/ (e.g., 'Nav/Nav')
 * @param fallback - Optional fallback component while loading
 * @returns A component that renders the layout-specific version
 *
 * @example
 * // In your component file:
 * export const DynamicNav = withLayoutComponent('Nav/Nav');
 *
 * // In Root.tsx:
 * const layout = startupConfig?.interface?.layout ?? 'default';
 * <DynamicNav layout={layout} {...otherProps} />
 */
export function withLayoutComponent<P extends { layout?: string }>(
  componentPath: string,
  fallback: React.ReactNode = null,
) {
  return function LayoutAwareComponent({ layout = 'default', ...props }: P) {
    const Component = useLayoutComponent(componentPath, layout);

    return (
      <React.Suspense fallback={fallback}>
        <Component {...(props as any)} />
      </React.Suspense>
    );
  };
}

/**
 * Synchronously imports a component based on layout (for use in async contexts)
 * @param componentPath - Path relative to components/
 * @param layout - Layout name
 * @returns Promise resolving to the component module
 *
 * @example
 * const NavModule = await importLayoutComponent('Nav/Nav', 'assistant-ui');
 * const Nav = NavModule.default;
 */
export async function importLayoutComponent<T = any>(
  componentPath: string,
  layout: string = 'default',
): Promise<{ default: ComponentType<T>; [key: string]: any }> {
  const importFn = resolveComponentPath(componentPath, layout);

  if (!importFn) {
    throw new Error(`Component not found: ${componentPath} (layout: ${layout})`);
  }

  return importFn();
}
