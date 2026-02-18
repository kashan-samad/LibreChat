import React, { useState } from 'react';
import { useRecoilValue } from 'recoil';
import {
  Providers,
  EModelEndpoint,
  defaultAgentCapabilities,
  isDocumentSupportedProvider,
} from 'librechat-data-provider';
import { TooltipAnchor, AttachmentIcon, SharePointIcon } from '@librechat/client';
import type { EndpointFileConfig } from 'librechat-data-provider';
import {
  useAgentToolPermissions,
  useAgentCapabilities,
  useGetAgentsConfig,
  useFileHandling,
  useLocalize,
} from '~/hooks';
import useSharePointFileHandling from '~/hooks/Files/useSharePointFileHandling';
import { SharePointPickerDialog } from '~/components/SharePoint';
import { useGetStartupConfig } from '~/data-provider';
import { ephemeralAgentByConvoId } from '~/store';
import { getSmartDefault } from '~/utils';
import { cn } from '~/utils';

interface AttachFileMenuProps {
  agentId?: string | null;
  endpoint?: string | null;
  disabled?: boolean | null;
  conversationId: string;
  endpointType?: EModelEndpoint;
  endpointFileConfig?: EndpointFileConfig;
  useResponsesApi?: boolean;
}

const AttachFileMenu = ({
  agentId,
  endpoint,
  disabled,
  endpointType,
  conversationId,
  endpointFileConfig,
  useResponsesApi,
}: AttachFileMenuProps) => {
  const localize = useLocalize();
  const isUploadDisabled = disabled ?? false;
  const [isActive, setIsActive] = useState(false);
  const ephemeralAgent = useRecoilValue(ephemeralAgentByConvoId(conversationId));

  const { agentsConfig } = useGetAgentsConfig();
  const { data: startupConfig } = useGetStartupConfig();
  const sharePointEnabled = startupConfig?.sharePointFilePickerEnabled;

  const [isSharePointDialogOpen, setIsSharePointDialogOpen] = useState(false);

  const capabilities = useAgentCapabilities(agentsConfig?.capabilities ?? defaultAgentCapabilities);
  const { fileSearchAllowedByAgent, codeAllowedByAgent, provider } = useAgentToolPermissions(
    agentId,
    ephemeralAgent,
  );

  const { handleFileChange } = useFileHandling();

  const { handleSharePointFiles, isProcessing, downloadProgress } = useSharePointFileHandling({
    toolResource: undefined,
  });

  const getAcceptFilter = () => {
    let currentProvider = provider || endpoint;
    if (currentProvider?.toLowerCase() === Providers.OPENROUTER) {
      currentProvider = Providers.OPENROUTER;
    }
    const isAzureWithResponsesApi =
      currentProvider === EModelEndpoint.azureOpenAI && useResponsesApi;

    if (
      isDocumentSupportedProvider(endpointType) ||
      isDocumentSupportedProvider(currentProvider) ||
      isAzureWithResponsesApi
    ) {
      if (currentProvider === Providers.GOOGLE || currentProvider === Providers.OPENROUTER) {
        return 'image/*,.heif,.heic,.pdf,application/pdf,video/*,audio/*';
      }
      return 'image/*,.heif,.heic,.pdf,application/pdf';
    }
    return 'image/*,.heif,.heic';
  };

  const inputId = 'attach-file-input-unified';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    const files = Array.from(e.target.files);
    const firstFile = files[0];
    const smartResource = getSmartDefault(
      firstFile,
      capabilities,
      fileSearchAllowedByAgent,
      codeAllowedByAgent,
    );
    handleFileChange(e, smartResource);
    e.target.value = '';
  };

  return (
    <>
      {/* Hidden file input — triggered via htmlFor label association */}
      <input
        id={inputId}
        multiple
        type="file"
        accept={getAcceptFilter()}
        style={{ display: 'none' }}
        onChange={handleChange}
        disabled={isUploadDisabled}
      />
      <TooltipAnchor
        render={
          <label
            htmlFor={inputId}
            aria-label={localize('com_sidepanel_attach_files')}
            aria-disabled={isUploadDisabled}
            onMouseDown={() => !isUploadDisabled && setIsActive(true)}
            onMouseUp={() => setIsActive(false)}
            onMouseLeave={() => setIsActive(false)}
            className={cn(
              'flex size-9 cursor-pointer items-center justify-center rounded-full p-1 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-opacity-50',
              isActive && 'bg-surface-hover',
              isUploadDisabled && 'cursor-not-allowed opacity-50',
            )}
          >
            <AttachmentIcon />
          </label>
        }
        description={localize('com_sidepanel_attach_files')}
        disabled={isUploadDisabled}
      />

      {sharePointEnabled && (
        <>
          <TooltipAnchor
            render={
              <button
                type="button"
                disabled={isUploadDisabled}
                onClick={() => setIsSharePointDialogOpen(true)}
                aria-label={localize('com_files_upload_sharepoint')}
                className="flex size-9 items-center justify-center rounded-full p-1 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-opacity-50"
              >
                <SharePointIcon className="icon-md" />
              </button>
            }
            description={localize('com_files_upload_sharepoint')}
            disabled={isUploadDisabled}
          />
          <SharePointPickerDialog
            isOpen={isSharePointDialogOpen}
            onOpenChange={setIsSharePointDialogOpen}
            onFilesSelected={async (sharePointFiles) => {
              try {
                await handleSharePointFiles(sharePointFiles);
                setIsSharePointDialogOpen(false);
              } catch (error) {
                console.error('SharePoint file processing error:', error);
              }
            }}
            isDownloading={isProcessing}
            downloadProgress={downloadProgress}
            maxSelectionCount={endpointFileConfig?.fileLimit}
          />
        </>
      )}
    </>
  );
};

export default React.memo(AttachFileMenu);
