import { useCallback, useEffect, memo, startTransition } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useMediaQuery } from '@librechat/client';
import { useLocalize, useAuthContext, useLocalStorage } from '~/hooks';
import { useTitleGeneration } from '~/data-provider';
import { cn } from '~/utils';
import { MessageSquare, LayoutGrid } from 'lucide-react';
import AccountSettings from '~/components/Nav/AccountSettings';

export const NAV_WIDTH = {
  MOBILE: 64,
  DESKTOP: 64,
} as const;

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

NavMask.displayName = 'NavMask';

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

    // Always render sidebar to avoid mount/unmount costs
    // Use transform for GPU-accelerated animation (no layout thrashing)
    const sidebarWidth = isSmallScreen ? NAV_WIDTH.MOBILE : NAV_WIDTH.DESKTOP;

    // Sidebar content (shared between mobile and desktop)
    const sidebarContent = (
      <div className="flex h-full flex-col">
        <nav
          id="chat-history-nav"
          aria-label={localize('com_ui_chat_history')}
          className="flex h-full flex-col items-center px-2 pb-3.5 pt-2"
          aria-hidden={!navVisible}
        >
          <div className="flex flex-1 flex-col items-center">
            {/* New Chat Button */}
            <div className="mb-2 w-full">
              <Link
                to="/c/new"
                className="hover:bg-surface-tertiary/80 flex h-10 w-10 items-center justify-center rounded-lg bg-surface-tertiary text-text-primary transition-colors"
                title={localize('com_ui_new_chat')}
                aria-label={localize('com_ui_new_chat')}
              >
                <MessageSquare className="h-5 w-5" />
              </Link>
            </div>

            {/* Agents Button */}
            <div className="mb-2 w-full">
              <Link
                to="/agents"
                className="hover:bg-surface-tertiary/80 flex h-10 w-10 items-center justify-center rounded-lg bg-surface-secondary text-text-primary transition-colors"
                title="Agents"
                aria-label="Agents"
              >
                <LayoutGrid className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Account Settings */}
          <AccountSettings />
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
              'nav fixed left-0 top-0 z-[200] h-full bg-surface-primary-alt',
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
        className="z-[200] flex-shrink-0 overflow-visible"
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
