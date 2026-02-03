import { Navigate } from 'react-router-dom';
import { useGetStartupConfig } from '~/data-provider';

/**
 * Wrapper component that conditionally renders a layout-specific route
 * Redirects to home if the current layout doesn't match the required layout
 */
export function LayoutRoute({
  requiredLayout,
  children,
}: {
  requiredLayout: string;
  children: React.ReactNode;
}) {
  const { data: startupConfig } = useGetStartupConfig();
  const currentLayout = startupConfig?.interface?.layout ?? 'default';

  // If the current layout matches the required layout, render the children
  if (currentLayout === requiredLayout) {
    return <>{children}</>;
  }

  // Otherwise, redirect to home
  return <Navigate to="/c/new" replace />;
}
