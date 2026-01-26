import { useCallback, useEffect, useState, memo, startTransition } from 'react';
import { useRecoilValue } from 'recoil';
import { motion } from 'framer-motion';
import { Skeleton, useMediaQuery } from '@librechat/client';
import { useLocalize, useAuthContext, useLocalStorage } from '~/hooks';
import { useConversationsInfiniteQuery, useTitleGeneration } from '~/data-provider';
import { cn } from '~/utils';
import store from '~/store';

export const NAV_WIDTH = {
  MOBILE: 320,
  DESKTOP: 260,
} as const;

const SearchBarSkeleton = memo(() => (
  <div className={cn('flex h-10 items-center py-2')}>
    <Skeleton className="h-10 w-full rounded-lg" />
  </div>
));

SearchBarSkeleton.displayName = 'SearchBarSkeleton';

const NavMask = memo(
  ({ navVisible, toggleNavVisible }: { navVisible: boolean; toggleNavVisible: () => void }) => (
    <div
      id="mobile-nav-mask-toggle"
      role="button"
      tabIndex={0}
      className={`nav-mask transition-opacity duration-200 ease-in-out ${navVisible ? 'active opacity-100' : 'opacity-0'}`}
      onClick={toggleNavVisible}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          toggleNavVisible();
        }
      }}
      aria-label="Toggle navigation"
    />
  ),
);

const Nav = memo(
  ({
    navVisible,
    setNavVisible,
  }: {
    navVisible: boolean;
    setNavVisible: React.Dispatch<React.SetStateAction<boolean>>;
  }) => {
    const localize = useLocalize();
    const { isAuthenticated } = useAuthContext();
    useTitleGeneration(isAuthenticated);

    const isSmallScreen = useMediaQuery('(max-width: 768px)');
    const [newUser, setNewUser] = useLocalStorage('newUser', true);
    const [tags] = useState<string[]>([]);

    const search = useRecoilValue(store.search);

    const { refetch } = useConversationsInfiniteQuery(
      {
        tags: tags.length === 0 ? undefined : tags,
        search: search.debouncedQuery || undefined,
      },
      {
        enabled: isAuthenticated,
        staleTime: 30000,
        cacheTime: 300000,
      },
    );

    const toggleNavVisible = useCallback(() => {
      // Use startTransition to mark this as a non-urgent update
      // This prevents blocking the main thread during the cascade of re-renders
      startTransition(() => {
        setNavVisible((prev: boolean) => {
          localStorage.setItem('navVisible', JSON.stringify(!prev));
          return !prev;
        });
        if (newUser) {
          setNewUser(false);
        }
      });
    }, [newUser, setNavVisible, setNewUser]);

    useEffect(() => {
      if (isSmallScreen) {
        const savedNavVisible = localStorage.getItem('navVisible');
        if (savedNavVisible === null) {
          toggleNavVisible();
        }
      }
    }, [isSmallScreen, toggleNavVisible]);

    useEffect(() => {
      refetch();
    }, [tags, refetch]);

    // Always render sidebar to avoid mount/unmount costs
    // Use transform for GPU-accelerated animation (no layout thrashing)
    const sidebarWidth = isSmallScreen ? NAV_WIDTH.MOBILE : NAV_WIDTH.DESKTOP;

    // Sidebar content (shared between mobile and desktop)
    const sidebarContent = (
      <div className="flex h-full flex-col">
        <nav
          id="custom-nav"
          aria-label="Custom Navigation"
          className="flex h-full flex-col px-4 pb-4 pt-4"
        >
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-lg font-semibold text-text-primary">{'Navigation'}</h1>
            <p className="mt-1 text-sm text-text-secondary">
              {localize('com_nav_custom_sidebar_demo')}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="mb-6">
            <h2 className="mb-3 text-sm font-medium text-text-primary">
              {localize('com_nav_quick_actions')}
            </h2>
            <div className="space-y-2">
              <button className="hover:bg-surface-tertiary/80 w-full rounded-lg bg-surface-tertiary px-3 py-2 text-left text-sm text-text-primary transition-colors">
                {localize('com_nav_new_document')}
              </button>
              <button className="hover:bg-surface-tertiary/80 w-full rounded-lg bg-surface-tertiary px-3 py-2 text-left text-sm text-text-primary transition-colors">
                {localize('com_nav_search_files')}
              </button>
              <button className="hover:bg-surface-tertiary/80 w-full rounded-lg bg-surface-tertiary px-3 py-2 text-left text-sm text-text-primary transition-colors">
                {localize('com_nav_settings')}
              </button>
            </div>
          </div>

          {/* Recent Items */}
          <div className="mb-6 flex-1">
            <h2 className="mb-3 text-sm font-medium text-text-primary">
              {localize('com_nav_recent_items')}
            </h2>
            <div className="space-y-1">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="hover:bg-surface-secondary/80 cursor-pointer rounded-lg bg-surface-secondary px-3 py-2 transition-colors"
                >
                  <div className="text-sm font-medium text-text-primary">
                    {localize('com_nav_item')} {item}
                  </div>
                  <div className="text-xs text-text-secondary">
                    {localize('com_nav_sample_description')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="border-border-primary mt-auto border-t pt-4">
            <div className="text-center text-xs text-text-secondary">
              {localize('com_nav_custom_layout_active')}
            </div>
          </div>
        </nav>
      </div>
    );

    // Mobile: Fixed positioned sidebar that slides over content
    // Uses CSS transitions (not Framer Motion) to sync perfectly with content animation
    if (isSmallScreen) {
      return (
        <>
          <div
            data-testid="nav"
            className={cn(
              'nav fixed left-0 top-0 z-[110] h-full bg-surface-primary-alt',
              navVisible && 'active',
            )}
            style={{
              width: sidebarWidth,
              transform: navVisible ? 'translateX(0)' : `translateX(-${sidebarWidth}px)`,
              transition: 'transform 0.2s ease-out',
            }}
          >
            {sidebarContent}
          </div>
          <NavMask navVisible={navVisible} toggleNavVisible={toggleNavVisible} />
        </>
      );
    }

    // Desktop: Inline sidebar with width transition
    return (
      <div
        className="flex-shrink-0 overflow-hidden"
        style={{ width: navVisible ? sidebarWidth : 0, transition: 'width 0.2s ease-out' }}
      >
        <motion.div
          data-testid="nav"
          className={cn('nav h-full bg-surface-primary-alt', navVisible && 'active')}
          style={{ width: sidebarWidth }}
          initial={false}
          animate={{
            x: navVisible ? 0 : -sidebarWidth,
          }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {sidebarContent}
        </motion.div>
      </div>
    );
  },
);

Nav.displayName = 'Nav';

export default Nav;
