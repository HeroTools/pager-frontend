import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  uploadApi,
  PresignedUrlRequest,
  ConfirmUploadRequest,
  DeleteAttachmentRequest,
} from "../api/upload-api";

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface FileUploadResult {
  attachmentId: string;
  filename: string;
  url: string;
  contentType: string;
  sizeBytes: number;
  status: "success" | "error";
  error?: string;
}

/**
 * Hook for getting presigned URLs
 */
export const useGetPresignedUrl = (workspaceId: string) => {
  return useMutation({
    mutationFn: (request: PresignedUrlRequest) =>
      uploadApi.getPresignedUrl(workspaceId, request),
    onError: (error) => {
      console.error("Failed to get presigned URL:", error);
    },
  });
};

/**
 * Hook for uploading files with Supabase's uploadToSignedUrl
 */
export const useUploadFile = (workspaceId: string) => {
  return useMutation({
    mutationFn: async ({
      supabase,
      path,
      token,
      file,
      onProgress,
    }: {
      supabase: any; // Supabase client
      path: string;
      token: string;
      file: File;
      onProgress?: (progress: UploadProgress) => void;
    }) => {
      const { data, error } = await supabase.storage
        .from("attachments")
        .uploadToSignedUrl(path, token, file, {
          onUploadProgress: onProgress
            ? (progress: any) => {
                onProgress({
                  loaded: progress.loaded,
                  total: progress.total,
                  percentage: (progress.loaded / progress.total) * 100,
                });
              }
            : undefined,
        });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onError: (error) => {
      console.error("File upload failed:", error);
    },
  });
};

/**
 * Hook for confirming upload completion
 */
export const useConfirmUpload = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ConfirmUploadRequest) =>
      uploadApi.confirmUpload(request),
    onSuccess: () => {
      // Invalidate relevant queries (e.g., attachment lists)
      queryClient.invalidateQueries({ queryKey: ["attachments"] });
    },
    onError: (error) => {
      console.error("Failed to confirm upload:", error);
    },
  });
};

/**
 * Hook for deleting attachments
 */
export const useDeleteAttachment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: DeleteAttachmentRequest) =>
      uploadApi.deleteAttachment(request),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["attachments"] });
    },
    onError: (error) => {
      console.error("Failed to delete attachment:", error);
    },
  });
};

/**
 * Comprehensive hook that handles the entire upload process
 */
export const useFileUpload = (workspaceId: string, supabase: any) => {
  const getPresignedUrlMutation = useGetPresignedUrl();
  const uploadFileMutation = useUploadFile();
  const confirmUploadMutation = useConfirmUpload();

  const uploadFile = async (
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<FileUploadResult> => {
    try {
      const fileId = crypto.randomUUID();

      // Step 1: Get presigned URL
      const presignedUrlResponse = await getPresignedUrlMutation.mutateAsync({
        workspaceId,
        fileId,
        filename: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      });

      if (!presignedUrlResponse.success) {
        throw new Error(
          presignedUrlResponse.error || "Failed to get presigned URL"
        );
      }

      const { signedUrl, token, path, publicUrl, attachmentId } =
        presignedUrlResponse.data;

      // Step 2: Upload file using Supabase's uploadToSignedUrl
      await uploadFileMutation.mutateAsync({
        supabase,
        path,
        token,
        file,
        onProgress,
      });

      // Step 3: Confirm upload
      const confirmResponse = await confirmUploadMutation.mutateAsync({
        attachmentId,
        workspaceId,
      });

      if (!confirmResponse.success) {
        throw new Error(confirmResponse.error || "Failed to confirm upload");
      }

      return {
        attachmentId,
        filename: file.name,
        url: publicUrl,
        contentType: file.type,
        sizeBytes: file.size,
        status: "success",
      };
    } catch (error) {
      console.error("Upload process failed:", error);

      return {
        attachmentId: "",
        filename: file.name,
        url: "",
        contentType: file.type,
        sizeBytes: file.size,
        status: "error",
        error: error instanceof Error ? error.message : "Upload failed",
      };
    }
  };

  const uploadMultipleFiles = async (
    files: File[],
    onProgress?: (fileIndex: number, progress: UploadProgress) => void,
    maxConcurrency: number = 3
  ): Promise<FileUploadResult[]> => {
    const results: FileUploadResult[] = [];

    // Upload files in batches to avoid overwhelming the server
    for (let i = 0; i < files.length; i += maxConcurrency) {
      const batch = files.slice(i, i + maxConcurrency);

      const batchPromises = batch.map((file, batchIndex) => {
        const fileIndex = i + batchIndex;
        return uploadFile(file, (progress) => {
          onProgress?.(fileIndex, progress);
        });
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  };

  return {
    uploadFile,
    uploadMultipleFiles,
    isUploading:
      getPresignedUrlMutation.isPending ||
      uploadFileMutation.isPending ||
      confirmUploadMutation.isPending,
    error:
      getPresignedUrlMutation.error ||
      uploadFileMutation.error ||
      confirmUploadMutation.error,
  };
};
