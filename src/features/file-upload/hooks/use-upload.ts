import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

import { uploadApi } from '@/features/file-upload/api/upload-api';
import type {
  ConfirmUploadRequest,
  DeleteAttachmentRequest,
  PresignedUrlRequest,
} from '@/features/file-upload/types';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface FileUploadResult {
  attachmentId: string;
  filename: string;
  storageUrl: string;
  contentType: string;
  sizeBytes: number;
  status: 'success' | 'error';
  error?: string;
}

export const useGetPresignedUrl = () => {
  return useMutation({
    mutationFn: (request: PresignedUrlRequest) => uploadApi.getPresignedUrl(request),
    onError: (error) => {
      console.error('Failed to get presigned URL:', error);
    },
  });
};

export const useDeleteAttachment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: DeleteAttachmentRequest) => uploadApi.deleteAttachment(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments'] });
    },
    onError: (error) => {
      console.error('Failed to delete attachment:', error);
    },
  });
};

export const useManualUpload = () => {
  return useMutation({
    mutationFn: async ({
      signedUrl,
      file,
      onProgress,
    }: {
      signedUrl: string;
      file: File;
      onProgress?: (progress: UploadProgress) => void;
    }) => {
      return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        if (onProgress) {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              onProgress({
                loaded: e.loaded,
                total: e.total,
                percentage: Math.round((e.loaded / e.total) * 100),
              });
            }
          });
        }
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        });
        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.open('PUT', signedUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });
    },
  });
};

export const useConfirmUpload = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: ConfirmUploadRequest) => uploadApi.confirmUpload(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments'] });
    },
    onError: (error) => {
      console.error('Failed to confirm upload:', error);
    },
  });
};

export const useFileUpload = (workspaceId: string) => {
  const getPresignedUrlMutation = useGetPresignedUrl();
  const manualUploadMutation = useManualUpload();
  const confirmUploadMutation = useConfirmUpload();

  // Use refs to track progress throttling more efficiently
  const progressThrottleRefs = useRef<Map<number, { lastUpdate: number; rafId?: number }>>(
    new Map(),
  );

  const createThrottledProgressCallback = useCallback(
    (onFileProgress: (fileIndex: number, progress: UploadProgress) => void) => {
      return (fileIndex: number, progress: UploadProgress) => {
        const now = Date.now();
        const progressInfo = progressThrottleRefs.current.get(fileIndex) || { lastUpdate: 0 };

        // Cancel any pending RAF for this file
        if (progressInfo.rafId) {
          cancelAnimationFrame(progressInfo.rafId);
        }

        // Update immediately for 100% or throttle others
        if (progress.percentage === 100 || now - progressInfo.lastUpdate > 150) {
          progressThrottleRefs.current.set(fileIndex, { lastUpdate: now });
          onFileProgress(fileIndex, progress);
        } else {
          // Use RAF to batch updates and prevent blocking the main thread
          const rafId = requestAnimationFrame(() => {
            progressThrottleRefs.current.set(fileIndex, { lastUpdate: Date.now() });
            onFileProgress(fileIndex, progress);
          });
          progressThrottleRefs.current.set(fileIndex, {
            lastUpdate: progressInfo.lastUpdate,
            rafId,
          });
        }
      };
    },
    [],
  );

  const uploadMultipleFiles = useCallback(
    async (
      files: File[],
      onFileProgress: (fileIndex: number, progress: UploadProgress) => void,
    ): Promise<FileUploadResult[]> => {
      // Clear previous progress tracking
      progressThrottleRefs.current.forEach((info) => {
        if (info.rafId) {
          cancelAnimationFrame(info.rafId);
        }
      });
      progressThrottleRefs.current.clear();

      const throttledProgress = createThrottledProgressCallback(onFileProgress);

      const processFile = async (file: File, index: number): Promise<FileUploadResult> => {
        try {
          const fileId = crypto.randomUUID();

          const presignedUrlResponse = await getPresignedUrlMutation.mutateAsync({
            workspaceId,
            fileId,
            filename: file.name,
            contentType: file.type,
            sizeBytes: file.size,
            filePurpose: 'attachments',
          });

          const { signed_url, file_id } = presignedUrlResponse;

          await manualUploadMutation.mutateAsync({
            signedUrl: signed_url,
            file,
            onProgress: (progress) => throttledProgress(index, progress),
          });

          const confirmedAttachment = await confirmUploadMutation.mutateAsync({
            workspaceId,
            attachmentId: file_id,
          });

          const fileData = confirmedAttachment.file;

          return {
            attachmentId: fileData.id,
            filename: fileData.original_filename,
            storageUrl: fileData.storage_url,
            contentType: fileData.content_type,
            sizeBytes: fileData.size_bytes,
            status: 'success',
          };
        } catch (error: unknown) {
          console.error(`Failed to upload ${file.name}:`, error);
          return {
            attachmentId: `error-${file.name}-${Date.now()}`,
            filename: file.name,
            storageUrl: '',
            contentType: file.type,
            sizeBytes: file.size,
            status: 'error',
            error: (error as Error)?.message || 'An unknown error occurred',
          };
        }
      };

      const results = await Promise.all(files.map((file, index) => processFile(file, index)));

      // Clean up progress tracking after completion
      progressThrottleRefs.current.forEach((info) => {
        if (info.rafId) {
          cancelAnimationFrame(info.rafId);
        }
      });
      progressThrottleRefs.current.clear();

      return results;
    },
    [
      workspaceId,
      getPresignedUrlMutation,
      manualUploadMutation,
      confirmUploadMutation,
      createThrottledProgressCallback,
    ],
  );

  return {
    uploadMultipleFiles,
    isUploading:
      getPresignedUrlMutation.isPending ||
      manualUploadMutation.isPending ||
      confirmUploadMutation.isPending,
  };
};
