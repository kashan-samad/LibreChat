import type { EToolResources } from 'librechat-data-provider';

/**
 * DragDropModal — purpose selection has been removed.
 *
 * Files dropped onto the chat area are now routed automatically using smart
 * defaults (see useDragHelpers.ts → getSmartDefault). This component is kept
 * as an empty stub so existing import sites continue to compile. It renders
 * nothing and will be removed in a future cleanup PR.
 */
interface DragDropModalProps {
  onOptionSelect: (option: EToolResources | undefined) => void;
  files: File[];
  isVisible: boolean;
  setShowModal: (showModal: boolean) => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DragDropModal = (_props: DragDropModalProps) => null;

export default DragDropModal;
