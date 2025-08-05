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

  const progressThrottleRefs = useRef<
    Map<number, { lastUpdate: number; timeout?: NodeJS.Timeout }>
  >(new Map());

  const createThrottledProgressCallback = useCallback(
    (onFileProgress: (fileIndex: number, progress: UploadProgress) => void) => {
      return (fileIndex: number, progress: UploadProgress) => {
        const now = Date.now();
        const progressInfo = progressThrottleRefs.current.get(fileIndex) || { lastUpdate: 0 };

        if (progressInfo.timeout) {
          clearTimeout(progressInfo.timeout);
        }

        // Update immediately for 100% or if enough time has passed for progress
        if (progress.percentage === 100 || now - progressInfo.lastUpdate > 50) {
          progressThrottleRefs.current.set(fileIndex, { lastUpdate: now });
          onFileProgress(fileIndex, progress);
        } else {
          // Schedule update for progress
          const timeout = setTimeout(() => {
            progressThrottleRefs.current.set(fileIndex, { lastUpdate: Date.now() });
            onFileProgress(fileIndex, progress);
          }, 50);
          progressThrottleRefs.current.set(fileIndex, {
            lastUpdate: progressInfo.lastUpdate,
            timeout,
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
        if (info.timeout) {
          clearTimeout(info.timeout);
        }
      });
      progressThrottleRefs.current.clear();

      const throttledProgress = createThrottledProgressCallback(onFileProgress);

      const processFile = async (file: File, index: number): Promise<FileUploadResult> => {
        try {
          const fileId = crypto.randomUUID();

          // Phase 1: Getting presigned URL (0-5%)
          throttledProgress(index, { loaded: 0, total: file.size, percentage: 0 });

          const presignedUrlResponse = await getPresignedUrlMutation.mutateAsync({
            workspaceId,
            fileId,
            filename: file.name,
            contentType: file.type,
            sizeBytes: file.size,
            filePurpose: 'attachments',
          });

          const { signed_url, file_id } = presignedUrlResponse;

          // Phase 1 complete (5%)
          throttledProgress(index, { loaded: 0, total: file.size, percentage: 5 });

          // Phase 2: Upload to S3 (5-99%)
          await manualUploadMutation.mutateAsync({
            signedUrl: signed_url,
            file,
            onProgress: (progress) => {
              // Map S3 upload progress (0-100%) to our phase 2 range (5-99%)
              const mappedPercentage = 5 + progress.percentage * 0.94;
              throttledProgress(index, {
                loaded: progress.loaded,
                total: progress.total,
                percentage: Math.round(mappedPercentage),
              });
            },
          });

          // Phase 2 complete (99%)
          throttledProgress(index, { loaded: file.size, total: file.size, percentage: 99 });

          // Phase 3: Confirming upload (99-100%)
          const confirmedAttachment = await confirmUploadMutation.mutateAsync({
            workspaceId,
            attachmentId: file_id,
          });

          // Phase 3 complete (100%)
          throttledProgress(index, { loaded: file.size, total: file.size, percentage: 100 });

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
        if (info.timeout) {
          clearTimeout(info.timeout);
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
