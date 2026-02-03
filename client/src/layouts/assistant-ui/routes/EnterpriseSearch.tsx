import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMediaQuery, TooltipAnchor, Button, NewChatIcon } from '@librechat/client';
import type { ContextType } from '~/common';
import { useDocumentTitle, useLocalize } from '~/hooks';
import { Search, Database, FileSearch, Sparkles } from 'lucide-react';
import { cn } from '~/utils';

/**
 * EnterpriseSearch - Main component for enterprise-wide search functionality
 *
 * Provides comprehensive search across documents, conversations, and enterprise data
 */
const EnterpriseSearch: React.FC = () => {
  const localize = useLocalize();
  const isSmallScreen = useMediaQuery('(max-width: 768px)');
  const { navVisible } = useOutletContext<ContextType>();

  // Set page title
  useDocumentTitle(`Enterprise Search | LibreChat`);

  return (
    <div className="flex h-full w-full flex-col">
      {/* Header */}
      <div className="border-b border-border-medium bg-surface-primary">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6 text-text-primary" />
            <h1 className="text-xl font-semibold text-text-primary">Enterprise Search</h1>
          </div>
          <TooltipAnchor
            description={localize('com_ui_new_chat')}
            render={
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => {
                  window.location.href = '/c/new';
                }}
              >
                <NewChatIcon className="h-4 w-4" />
                {!isSmallScreen && <span>{localize('com_ui_new_chat')}</span>}
              </Button>
            }
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-8">
          {/* Search Input Section */}
          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                placeholder="Search across all enterprise data..."
                className="h-14 w-full rounded-lg border border-border-medium bg-surface-primary pl-12 pr-4 text-text-primary placeholder:text-text-secondary focus:border-text-primary focus:outline-none focus:ring-1 focus:ring-text-primary"
              />
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Conversations Search */}
            <div className="rounded-lg border border-border-medium bg-surface-secondary p-6 transition-all hover:border-text-primary">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-surface-tertiary">
                <Search className="h-6 w-6 text-text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-text-primary">
                Conversation Search
              </h3>
              <p className="text-sm text-text-secondary">
                Search through all your conversations and chat history to find specific discussions
                and insights.
              </p>
            </div>

            {/* Document Search */}
            <div className="rounded-lg border border-border-medium bg-surface-secondary p-6 transition-all hover:border-text-primary">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-surface-tertiary">
                <FileSearch className="h-6 w-6 text-text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-text-primary">Document Search</h3>
              <p className="text-sm text-text-secondary">
                Search across all uploaded documents, files, and attachments for relevant
                information.
              </p>
            </div>

            {/* AI-Powered Search */}
            <div className="rounded-lg border border-border-medium bg-surface-secondary p-6 transition-all hover:border-text-primary">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-surface-tertiary">
                <Sparkles className="h-6 w-6 text-text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-text-primary">AI-Powered Search</h3>
              <p className="text-sm text-text-secondary">
                Use natural language queries to find exactly what you're looking for with AI
                assistance.
              </p>
            </div>
          </div>

          {/* Recent Searches Section */}
          <div className="mt-12">
            <h2 className="mb-4 text-lg font-semibold text-text-primary">Recent Searches</h2>
            <div className="rounded-lg border border-border-medium bg-surface-secondary p-8 text-center">
              <p className="text-text-secondary">No recent searches yet</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-text-primary">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Advanced Search
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <FileSearch className="h-4 w-4" />
                Search Filters
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Export Results
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseSearch;
