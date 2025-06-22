import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ConfirmUploadRequest,
  DeleteAttachmentRequest,
  PresignedUrlRequest,
} from "../types";
import { uploadApi } from "../api/upload-api";

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
  status: "success" | "error";
  error?: string;
}

/**
 * Hook for getting presigned URLs
 */
export const useGetPresignedUrl = () => {
  return useMutation({
    mutationFn: (request: PresignedUrlRequest) =>
      uploadApi.getPresignedUrl(request),
    onError: (error) => {
      console.error("Failed to get presigned URL:", error);
    },
  });
};

/**
 * Hook for uploading files with Supabase's uploadToSignedUrl
 */
export const useUploadFile = () => {
  return useMutation({
    mutationFn: async ({
      workspaceId,
      supabase,
      path,
      token,
      file,
      onProgress,
    }: {
      workspaceId: string;
      supabase: any; // Supabase client
      path: string;
      token: string;
      file: File;
      onProgress?: (progress: UploadProgress) => void;
    }) => {
      // Convert File to FileBody (ArrayBuffer) as required by Supabase
      const fileBody = await file.arrayBuffer();

      // Use uploadToSignedUrl with the correct FileBody type
      const { data, error } = await supabase.storage
        .from("attachments")
        .uploadToSignedUrl(path, token, fileBody, {
          upsert: false, // Make sure this matches your token settings
          contentType: file.type, // Explicitly set content type
          onUploadProgress: onProgress
            ? (progress: any) => {
                onProgress({
                  loaded: progress.loaded,
                  total: progress.total,
                  percentage: Math.round(
                    (progress.loaded / progress.total) * 100
                  ),
                });
              }
            : undefined,
        });

      if (error) {
        console.error("Supabase upload error:", error);
        throw new Error(`Upload failed: ${error.message}`);
      }

      return data;
    },
    onError: (error) => {
      console.error("File upload failed:", error);
    },
  });
};

/**
 * Alternative manual upload method if uploadToSignedUrl continues to have issues
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

        // Track upload progress
        if (onProgress) {
          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              onProgress({
                loaded: event.loaded,
                total: event.total,
                percentage: Math.round((event.loaded / event.total) * 100),
              });
            }
          });
        }

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(
              new Error(
                `Upload failed with status: ${xhr.status} - ${xhr.responseText}`
              )
            );
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Network error during upload"));
        });

        xhr.addEventListener("timeout", () => {
          reject(new Error("Upload timeout"));
        });

        // Open PUT request to signed URL
        xhr.open("PUT", signedUrl);

        // Set content type to match the file
        xhr.setRequestHeader("Content-Type", file.type);

        // Send the raw file data (not multipart)
        xhr.send(file);
      });
    },
    onError: (error) => {
      console.error("Manual upload failed:", error);
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
  const manualUploadMutation = useManualUpload();
  const confirmUploadMutation = useConfirmUpload();

  const uploadFile = async (
    file: File,
    onProgress?: (progress: UploadProgress) => void,
    useManualMethod: boolean = false
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
        filePurpose: "attachments",
      });

      const { signed_url, token, path, public_url, file_id } =
        presignedUrlResponse;

      // Step 2: Upload file
      if (useManualMethod) {
        // Use manual XMLHttpRequest method
        await manualUploadMutation.mutateAsync({
          signedUrl: signed_url,
          file,
          onProgress,
        });
      } else {
        // Use Supabase's uploadToSignedUrl method
        await uploadFileMutation.mutateAsync({
          workspaceId,
          supabase,
          path,
          token,
          file,
          onProgress,
        });
      }

      // Step 3: Confirm upload
      await confirmUploadMutation.mutateAsync({
        workspaceId,
        attachmentId: file_id,
      });

      return {
        attachmentId: file_id,
        filename: file.name,
        publicUrl: public_url,
        contentType: file.type,
        sizeBytes: file.size,
        status: "success",
      };
    } catch (error) {
      console.error("Upload process failed:", error);

      return {
        attachmentId: "",
        filename: file.name,
        publicUrl: "",
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
    maxConcurrency: number = 3,
    useManualMethod: boolean = false
  ): Promise<FileUploadResult[]> => {
    const results: FileUploadResult[] = [];

    // Upload files in batches to avoid overwhelming the server
    for (let i = 0; i < files.length; i += maxConcurrency) {
      const batch = files.slice(i, i + maxConcurrency);

      const batchPromises = batch.map((file, batchIndex) => {
        const fileIndex = i + batchIndex;
        return uploadFile(
          file,
          (progress) => {
            onProgress?.(fileIndex, progress);
          },
          useManualMethod
        );
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
      manualUploadMutation.isPending ||
      confirmUploadMutation.isPending,
    error:
      getPresignedUrlMutation.error ||
      uploadFileMutation.error ||
      manualUploadMutation.error ||
      confirmUploadMutation.error,
  };
};
