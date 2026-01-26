import React, { lazy, ComponentType, LazyExoticComponent } from 'react';
import { useGetStartupConfig } from '~/data-provider';

/**
 * Cache for dynamically loaded components to avoid re-importing
 */
const componentCache = new Map<string, LazyExoticComponent<ComponentType<any>>>();

/**
 * Dynamically loads a component based on the current layout.
 * If the component exists in the layout-specific directory, it loads from there.
 * Otherwise, it falls back to the original component location.
 *
 * @param componentPath - The path to the component relative to src/ (e.g., 'components/Nav/Nav')
 * @param layoutPath - Optional custom layout path (defaults to current layout from config)
 * @returns A lazy-loaded React component
 *
 * @example
 * // In a component file:
 * const Nav = useDynamicComponent('components/Nav/Nav');
 * return <Nav {...props} />;
 *
 * @example
 * // For a specific layout:
 * const Header = useDynamicComponent('components/Chat/Header', 'assistant-ui');
 */
export function useDynamicComponent<T = any>(
  componentPath: string,
  layoutPath?: string,
): LazyExoticComponent<ComponentType<T>> {
  const { data: startupConfig } = useGetStartupConfig();
  const currentLayout = layoutPath ?? startupConfig?.interface?.layout ?? 'default';

  const cacheKey = `${currentLayout}:${componentPath}`;

  // Return cached component if it exists
  if (componentCache.has(cacheKey)) {
    return componentCache.get(cacheKey) as LazyExoticComponent<ComponentType<T>>;
  }

  // Clean up the component path (remove leading/trailing slashes, .tsx extension)
  const cleanPath = componentPath.replace(/^\/+|\/+$/g, '').replace(/\.tsx$/, '');

  let LazyComponent: LazyExoticComponent<ComponentType<T>>;

  if (currentLayout !== 'default') {
    // Try to load from layout-specific directory first
    LazyComponent = lazy(async () => {
      try {
        // Try layout-specific path
        const layoutSpecificPath = `~/layouts/${currentLayout}/${cleanPath}`;
        const module = await import(/* @vite-ignore */ layoutSpecificPath);
        return module;
      } catch (error) {
        // Fallback to original path
        console.log(
          `Component not found in layout "${currentLayout}", falling back to default: ${cleanPath}`,
        );
        const originalPath = `~/${cleanPath}`;
        const module = await import(/* @vite-ignore */ originalPath);
        return module;
      }
    });
  } else {
    // Load from original path for default layout
    LazyComponent = lazy(() => import(/* @vite-ignore */ `~/${cleanPath}`));
  }

  // Cache the component
  componentCache.set(cacheKey, LazyComponent);

  return LazyComponent;
}

/**
 * Higher-order component that wraps a component with dynamic loading based on layout.
 * This is useful for components that need to be loaded at the module level.
 *
 * @param componentPath - The path to the component relative to src/
 * @param fallbackComponent - Optional fallback component to show while loading
 * @returns A component that dynamically loads based on layout
 *
 * @example
 * // Export a dynamically loaded component
 * export const Nav = withDynamicComponent('components/Nav/Nav');
 *
 * @example
 * // With a custom fallback
 * export const Header = withDynamicComponent('components/Chat/Header', <Skeleton />);
 */
export function withDynamicComponent<T = any>(
  componentPath: string,
  fallbackComponent?: React.ReactNode,
) {
  return function DynamicComponent(props: T) {
    const Component = useDynamicComponent(componentPath);
    return (
      <React.Suspense fallback={fallbackComponent ?? null}>
        <Component {...props} />
      </React.Suspense>
    );
  };
}

/**
 * Synchronously determines which component path to use based on layout.
 * This is useful for static imports where you need to know the path at build time.
 *
 * @param componentPath - The path to the component relative to src/
 * @param layout - The layout name (e.g., 'assistant-ui')
 * @returns The resolved component path
 *
 * @example
 * import Nav from getComponentPath('components/Nav/Nav', 'assistant-ui');
 */
export function getComponentPath(componentPath: string, layout: string = 'default'): string {
  const cleanPath = componentPath.replace(/^\/+|\/+$/g, '').replace(/\.tsx$/, '');

  if (layout !== 'default') {
    return `~/layouts/${layout}/${cleanPath}`;
  }

  return `~/${cleanPath}`;
}

/**
 * Creates a dynamic import function that tries layout-specific path first, then falls back.
 * This is useful for code-splitting and lazy loading.
 *
 * @param componentPath - The path to the component relative to src/
 * @param layout - The layout name
 * @returns A promise that resolves to the component module
 *
 * @example
 * const NavModule = await dynamicImport('components/Nav/Nav', 'assistant-ui');
 * const Nav = NavModule.default;
 */
export async function dynamicImport<T = any>(
  componentPath: string,
  layout: string = 'default',
): Promise<{ default: ComponentType<T>; [key: string]: any }> {
  const cleanPath = componentPath.replace(/^\/+|\/+$/g, '').replace(/\.tsx$/, '');

  if (layout !== 'default') {
    try {
      // Try layout-specific path
      const layoutSpecificPath = `~/layouts/${layout}/${cleanPath}`;
      return await import(/* @vite-ignore */ layoutSpecificPath);
    } catch (error) {
      console.log(`Component not found in layout "${layout}", falling back to default: ${cleanPath}`);
      // Fallback to original path
      return await import(/* @vite-ignore */ `~/${cleanPath}`);
    }
  }

  // Load from original path
  return await import(/* @vite-ignore */ `~/${cleanPath}`);
}
