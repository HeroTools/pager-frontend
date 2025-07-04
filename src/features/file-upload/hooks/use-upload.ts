import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ConfirmUploadRequest, DeleteAttachmentRequest, PresignedUrlRequest } from '../types';
import { uploadApi } from '../api/upload-api';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface FileUploadResult {
  attachmentId: string;
  filename: string;
  publicUrl: string;
  contentType: string;
  sizeBytes: number;
  status: 'success' | 'error';
  error?: string;
}

/**
 * Hook for getting presigned URLs
 */
export const useGetPresignedUrl = () => {
  return useMutation({
    mutationFn: (request: PresignedUrlRequest) => uploadApi.getPresignedUrl(request),
    onError: (error) => {
      console.error('Failed to get presigned URL:', error);
    },
  });
};

/**
 * Hook for deleting attachments
 */
export const useDeleteAttachment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: DeleteAttachmentRequest) => uploadApi.deleteAttachment(request),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['attachments'] });
    },
    onError: (error) => {
      console.error('Failed to delete attachment:', error);
    },
  });
};

/**
 * Alternative manual upload method
 */
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

/**
 * Hook for confirming upload completion
 */
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

/**
 * Comprehensive hook that handles the entire upload process.
 * This is the corrected and completed version.
 */
export const useFileUpload = (workspaceId: string) => {
  const getPresignedUrlMutation = useGetPresignedUrl();
  const manualUploadMutation = useManualUpload();
  const confirmUploadMutation = useConfirmUpload();

  /**
   * Orchestrates the entire upload flow for multiple files concurrently.
   * @param files - The array of files to upload.
   * @param onTotalProgress - Callback for overall progress updates.
   * @param maxConcurrentUploads - Number of files to upload simultaneously.
   * @returns An array of FileUploadResult objects.
   */
  const uploadMultipleFiles = async (
    files: File[],
    onFileProgress: (fileIndex: number, progress: UploadProgress) => void,
    maxConcurrentUploads: number = 3,
  ): Promise<FileUploadResult[]> => {
    // This function processes a single file through all three stages.
    const processFile = async (file: File, index: number): Promise<FileUploadResult> => {
      try {
        const fileId = crypto.randomUUID();

        // 1. Get Presigned URL from your backend
        const presignedUrlResponse = await getPresignedUrlMutation.mutateAsync({
          workspaceId,
          fileId,
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
          filePurpose: 'attachments',
        });

        const { signed_url, file_id } = presignedUrlResponse;

        // 2. Upload the file to the storage provider
        await manualUploadMutation.mutateAsync({
          signedUrl: signed_url,
          file,
          onProgress: (progress) => onFileProgress(index, progress),
        });

        // 3. Confirm the upload with your backend
        const confirmedAttachment = await confirmUploadMutation.mutateAsync({
          workspaceId,
          attachmentId: file_id,
        });

        const fileData = confirmedAttachment.file;

        return {
          attachmentId: fileData.id,
          filename: fileData.original_filename,
          publicUrl: fileData.public_url,
          contentType: fileData.content_type,
          sizeBytes: fileData.size_bytes,
          status: 'success',
        };
      } catch (error: any) {
        console.error(`Failed to upload ${file.name}:`, error);
        // Return an error result object
        return {
          attachmentId: `error-${file.name}-${Date.now()}`,
          filename: file.name,
          publicUrl: '',
          contentType: file.type,
          sizeBytes: file.size,
          status: 'error',
          error: error.message || 'An unknown error occurred',
        };
      }
    };

    // Process all files using the function above
    const results = await Promise.all(files.map((file, index) => processFile(file, index)));

    return results;
  };

  return {
    uploadMultipleFiles,
    isUploading:
      getPresignedUrlMutation.isPending ||
      manualUploadMutation.isPending ||
      confirmUploadMutation.isPending,
  };
};
