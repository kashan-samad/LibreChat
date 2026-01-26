import {
  useCallback,
  useEffect,
  useState,
  useMemo,
  memo,
  lazy,
  Suspense,
  useRef,
  startTransition,
} from 'react';
import { useRecoilValue } from 'recoil';
import { motion } from 'framer-motion';
import { Skeleton, useMediaQuery } from '@librechat/client';
import type { InfiniteQueryObserverResult } from '@tanstack/react-query';
import type { ConversationListResponse } from 'librechat-data-provider';
import type { List } from 'react-virtualized';
import { useLocalize, useAuthContext, useLocalStorage, useNavScrolling } from '~/hooks';
import { useConversationsInfiniteQuery, useTitleGeneration } from '~/data-provider';
import { Conversations } from '~/components/Conversations';
import { cn } from '~/utils';
import store from '~/store';
import { MessageSquare, LayoutGrid } from 'lucide-react';

const AccountSettings = lazy(() => import('~/components/Nav/AccountSettings'));

export const NAV_WIDTH = {
  MOBILE: 64,
  DESKTOP: 64,
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
    const [isChatsExpanded, setIsChatsExpanded] = useLocalStorage('chatsExpanded', true);
    const [showLoading, setShowLoading] = useState(false);
    const [tags] = useState<string[]>([]);

    const search = useRecoilValue(store.search);

    const { data, fetchNextPage, isFetchingNextPage, isLoading, isFetching, refetch } =
      useConversationsInfiniteQuery(
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

    const computedHasNextPage = useMemo(() => {
      if (data?.pages && data.pages.length > 0) {
        const lastPage: ConversationListResponse = data.pages[data.pages.length - 1];
        return lastPage.nextCursor !== null;
      }
      return false;
    }, [data?.pages]);

    const outerContainerRef = useRef<HTMLDivElement>(null);
    const conversationsRef = useRef<List | null>(null);

    const { moveToTop } = useNavScrolling<ConversationListResponse>({
      setShowLoading,
      fetchNextPage: async (options?) => {
        if (computedHasNextPage) {
          return fetchNextPage(options);
        }
        return Promise.resolve(
          {} as InfiniteQueryObserverResult<ConversationListResponse, unknown>,
        );
      },
      isFetchingNext: isFetchingNextPage,
    });

    const conversations = useMemo(() => {
      return data ? data.pages.flatMap((page) => page.conversations) : [];
    }, [data]);

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

    const itemToggleNav = useCallback(() => {
      if (isSmallScreen) {
        toggleNavVisible();
      }
    }, [isSmallScreen, toggleNavVisible]);

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

    const loadMoreConversations = useCallback(() => {
      if (isFetchingNextPage || !computedHasNextPage) {
        return;
      }

      fetchNextPage();
    }, [isFetchingNextPage, computedHasNextPage, fetchNextPage]);

    const [isSearchLoading, setIsSearchLoading] = useState(
      !!search.query && (search.isTyping || isLoading || isFetching),
    );

    useEffect(() => {
      if (search.isTyping) {
        setIsSearchLoading(true);
      } else if (!isLoading && !isFetching) {
        setIsSearchLoading(false);
      } else if (!!search.query && (isLoading || isFetching)) {
        setIsSearchLoading(true);
      }
    }, [search.query, search.isTyping, isLoading, isFetching]);

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
          <div
            className="flex flex-1 flex-col items-center overflow-hidden"
            ref={outerContainerRef}
          >
            {/* New Chat Button */}
            <div className="mb-2 w-full">
              <button
                className="hover:bg-surface-tertiary/80 flex h-10 w-10 items-center justify-center rounded-lg bg-surface-tertiary text-text-primary transition-colors"
                title={localize('com_ui_new_chat')}
                aria-label={localize('com_ui_new_chat')}
                onClick={() => {
                  window.location.href = '/';
                }}
              >
                <MessageSquare className="h-5 w-5" />
              </button>
            </div>

            {/* Agents Button */}
            <div className="mb-2 w-full">
              <button
                className="hover:bg-surface-tertiary/80 flex h-10 w-10 items-center justify-center rounded-lg bg-surface-secondary text-text-primary transition-colors"
                title="Agents"
                aria-label="Agents"
                onClick={() => {
                  window.location.href = '/agents';
                }}
              >
                <LayoutGrid className="h-5 w-5" />
              </button>
            </div>

            {/* Conversations List */}
            <div className="flex min-h-0 flex-grow flex-col overflow-hidden">
              <Conversations
                conversations={conversations}
                moveToTop={moveToTop}
                toggleNav={itemToggleNav}
                containerRef={conversationsRef}
                loadMoreConversations={loadMoreConversations}
                isLoading={isFetchingNextPage || showLoading || isLoading}
                isSearchLoading={isSearchLoading}
                isChatsExpanded={isChatsExpanded}
                setIsChatsExpanded={setIsChatsExpanded}
              />
            </div>
          </div>

          {/* Account Settings */}
          <Suspense fallback={<Skeleton className="mt-1 h-10 w-10 rounded-xl" />}>
            <AccountSettings />
          </Suspense>
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
