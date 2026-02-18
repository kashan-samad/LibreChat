import { EToolResources } from 'librechat-data-provider';

interface SmartDefaultCapabilities {
  fileSearchEnabled: boolean;
  codeEnabled: boolean;
  contextEnabled: boolean;
}

/**
 * Determines the appropriate tool_resource for a file based on its type and the active
 * agent capabilities. Used to auto-assign purpose when a user uploads a file without
 * explicitly choosing from a dropdown.
 *
 * Priority order (for non-image files):
 *   1. file_search — best default for documents when RAG is available
 *   2. context     — text extraction fallback
 *   3. execute_code — code files when only code interpreter is available
 *   4. undefined   — direct provider upload (no special processing)
 *
 * Images always default to direct provider upload (undefined) because they are
 * natively understood by vision-capable providers and do not benefit from RAG indexing.
 */
export function getSmartDefault(
  file: File,
  capabilities: SmartDefaultCapabilities,
  fileSearchAllowedByAgent: boolean,
  codeAllowedByAgent: boolean,
): EToolResources | undefined {
  const isImage = file.type.startsWith('image/');

  if (isImage) {
    return undefined;
  }

  if (capabilities.fileSearchEnabled && fileSearchAllowedByAgent) {
    return EToolResources.file_search;
  }

  if (capabilities.contextEnabled) {
    return EToolResources.context;
  }

  if (capabilities.codeEnabled && codeAllowedByAgent) {
    return EToolResources.execute_code;
  }

  return undefined;
}
