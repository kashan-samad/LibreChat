import React, { useState, useMemo } from 'react';
import * as Ariakit from '@ariakit/react';
import { FileSearch, FileImageIcon, FileType2Icon, TerminalSquareIcon, ChevronDown } from 'lucide-react';
import { EToolResources } from 'librechat-data-provider';
import { DropdownPopup } from '@librechat/client';
import type { MenuItemProps } from '~/common';
import { cn } from '~/utils';
import { useLocalize } from '~/hooks';

interface PurposeOption {
  value: EToolResources | undefined;
  label: string;
  icon: React.JSX.Element;
  colorClass: string;
}

interface PurposePillProps {
  toolResource: EToolResources | undefined;
  fileSearchEnabled: boolean;
  fileSearchAllowedByAgent: boolean;
  contextEnabled: boolean;
  codeEnabled: boolean;
  codeAllowedByAgent: boolean;
  providerSupportsDocuments: boolean;
  onPurposeChange: (newToolResource: EToolResources | undefined) => void;
  disabled?: boolean;
}

const purposeColorMap: Record<string, string> = {
  [EToolResources.file_search]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  [EToolResources.context]: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  [EToolResources.execute_code]: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  provider: 'bg-surface-secondary text-text-secondary',
};

function getPurposeColorClass(toolResource: EToolResources | undefined): string {
  if (toolResource == null) {
    return purposeColorMap['provider'];
  }
  return purposeColorMap[toolResource] ?? purposeColorMap['provider'];
}

const PurposePill = ({
  toolResource,
  fileSearchEnabled,
  fileSearchAllowedByAgent,
  contextEnabled,
  codeEnabled,
  codeAllowedByAgent,
  providerSupportsDocuments,
  onPurposeChange,
  disabled = false,
}: PurposePillProps) => {
  const localize = useLocalize();
  const [isOpen, setIsOpen] = useState(false);

  const options = useMemo<PurposeOption[]>(() => {
    const items: PurposeOption[] = [];

    items.push({
      value: undefined,
      label: providerSupportsDocuments
        ? localize('com_ui_upload_provider')
        : localize('com_ui_upload_image_input'),
      icon: <FileImageIcon className="icon-sm" />,
      colorClass: purposeColorMap['provider'],
    });

    if (contextEnabled) {
      items.push({
        value: EToolResources.context,
        label: localize('com_ui_upload_ocr_text'),
        icon: <FileType2Icon className="icon-sm" />,
        colorClass: purposeColorMap[EToolResources.context],
      });
    }

    if (fileSearchEnabled && fileSearchAllowedByAgent) {
      items.push({
        value: EToolResources.file_search,
        label: localize('com_ui_upload_file_search'),
        icon: <FileSearch className="icon-sm" />,
        colorClass: purposeColorMap[EToolResources.file_search],
      });
    }

    if (codeEnabled && codeAllowedByAgent) {
      items.push({
        value: EToolResources.execute_code,
        label: localize('com_ui_upload_code_files'),
        icon: <TerminalSquareIcon className="icon-sm" />,
        colorClass: purposeColorMap[EToolResources.execute_code],
      });
    }

    return items;
  }, [
    localize,
    contextEnabled,
    codeEnabled,
    codeAllowedByAgent,
    fileSearchEnabled,
    fileSearchAllowedByAgent,
    providerSupportsDocuments,
  ]);

  const currentOption = options.find((o) => o.value === toolResource) ?? options[0];

  const dropdownItems = useMemo<MenuItemProps[]>(
    () =>
      options.map((option) => ({
        label: option.label,
        icon: option.icon,
        ariaChecked: option.value === toolResource,
        onClick: () => {
          if (option.value !== toolResource) {
            onPurposeChange(option.value);
          }
        },
      })),
    [options, toolResource, onPurposeChange],
  );

  if (options.length <= 1) {
    return null;
  }

  const trigger = (
    <Ariakit.MenuButton
      render={
        <button
          type="button"
          disabled={disabled}
          aria-label={`File purpose: ${currentOption?.label ?? ''}`}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className={cn(
            'flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none transition-opacity',
            getPurposeColorClass(toolResource),
            disabled ? 'cursor-default opacity-60' : 'cursor-pointer hover:opacity-80',
          )}
        >
          <span className="flex items-center gap-1">
            {currentOption?.icon}
            <span className="max-w-[80px] truncate">{currentOption?.label}</span>
          </span>
          {!disabled && <ChevronDown className="size-2.5 shrink-0" />}
        </button>
      }
    />
  );

  return (
    <DropdownPopup
      menuId="purpose-pill-menu"
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      trigger={trigger}
      items={dropdownItems}
      modal={false}
      portal={true}
      gutter={4}
      unmountOnHide={true}
      className="min-w-[160px]"
      iconClassName="mr-0"
    />
  );
};

export default PurposePill;
