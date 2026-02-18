import type { ExtendedFile, FileSetter } from '~/common';
import useSetFilesToDelete from './useSetFilesToDelete';

export default function useUpdateFiles(setFiles: FileSetter) {
  const setFilesToDelete = useSetFilesToDelete();

  const addFile = (newFile: ExtendedFile) => {
    setFiles((currentFiles) => {
      const updatedFiles = new Map(currentFiles);
      updatedFiles.set(newFile.file_id, newFile);
      return updatedFiles;
    });
  };

  const replaceFile = (newFile: ExtendedFile) => {
    setFiles((currentFiles) => {
      const updatedFiles = new Map(currentFiles);

      // The Map key may be temp_file_id (set at upload time) while newFile.file_id
      // may have been updated to the server-assigned id in onSuccess. Find the
      // existing entry by scanning both the key and the stored file_id field so we
      // always overwrite the correct slot rather than inserting a second entry.
      let mapKey = newFile.file_id;
      if (!updatedFiles.has(mapKey)) {
        for (const [k, v] of updatedFiles) {
          if (v.file_id === newFile.file_id || v.temp_file_id === newFile.file_id) {
            mapKey = k;
            break;
          }
        }
      }

      updatedFiles.set(mapKey, newFile);
      return updatedFiles;
    });
  };

  const updateFileById = (fileId: string, updates: Partial<ExtendedFile>, isEntityFile = false) => {
    setFiles((currentFiles) => {
      // The Map key may be a temp_file_id while the stored file_id field has been
      // updated to the server-assigned id. Scan for a matching entry so that
      // progress updates after a purpose-change re-upload always find their slot.
      let mapKey = fileId;
      if (!currentFiles.has(mapKey)) {
        for (const [k, v] of currentFiles) {
          if (v.file_id === fileId || v.temp_file_id === fileId) {
            mapKey = k;
            break;
          }
        }
      }

      if (!currentFiles.has(mapKey)) {
        console.warn(`File with id ${fileId} not found.`);
        return currentFiles;
      }

      const updatedFiles = new Map(currentFiles);
      const currentFile = updatedFiles.get(mapKey);
      if (!currentFile) {
        console.warn(`File with id ${fileId} not found.`);
        return currentFiles;
      }
      updatedFiles.set(mapKey, { ...currentFile, ...updates });
      const filepath = updates['filepath'] ?? '';
      if (filepath && updates['progress'] !== 1 && !isEntityFile) {
        const files = Object.fromEntries(updatedFiles);
        setFilesToDelete(files);
      }

      return updatedFiles;
    });
  };

  const deleteFileById = (fileId: string) => {
    setFiles((currentFiles) => {
      const updatedFiles = new Map(currentFiles);
      if (updatedFiles.has(fileId)) {
        updatedFiles.delete(fileId);
      } else {
        console.warn(`File with id ${fileId} not found.`);
      }

      const files = Object.fromEntries(updatedFiles);
      setFilesToDelete(files);
      return updatedFiles;
    });
  };

  return {
    addFile,
    replaceFile,
    updateFileById,
    deleteFileById,
  };
}
