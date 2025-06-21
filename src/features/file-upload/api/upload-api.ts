import { httpClient } from "@/lib/api/http-client";

export interface PresignedUrlRequest {
  workspaceId: string;
  fileId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
}

export interface PresignedUrlResponse {
  success: boolean;
  data: {
    signedUrl: string;
    token: string;
    path: string;
    publicUrl: string;
    attachmentId: string;
    expiresIn: number;
  };
  error?: string;
}

export interface ConfirmUploadResponse {
  success: boolean;
  data: {
    attachment: {
      id: string;
      original_filename: string;
      content_type: string;
      size_bytes: number;
      url: string;
      status: string;
    };
  };
  error?: string;
}

export interface DeleteAttachmentResponse {
  success: boolean;
  error?: string;
}

export const uploadApi = {
  /**
   * Request a presigned URL for file upload
   */
  getPresignedUrl: (
    workspaceId: string,
    request: PresignedUrlRequest
  ): Promise<PresignedUrlResponse> => {
    return httpClient.post(
      `/workspaces/${workspaceId}/attachments/generate-presigned-url`,
      request
    );
  },

  /**
   * Confirm upload completion
   */
  confirmUpload: (
    workspaceId: string,
    attachmentId: string
  ): Promise<ConfirmUploadResponse> => {
    return httpClient.post(
      `/workspaces/${workspaceId}/attachments/${attachmentId}/confirm-upload`
    );
  },

  /**
   * Delete an attachment
   */
  deleteAttachment: (
    workspaceId: string,
    attachmentId: string
  ): Promise<DeleteAttachmentResponse> => {
    return httpClient.delete(
      `/workspaces/${workspaceId}/attachments/${attachmentId}`
    );
  },
};
