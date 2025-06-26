import api from "@/lib/api/axios-client";
import {
  ConfirmUploadRequest,
  ConfirmUploadResponse,
  DeleteAttachmentRequest,
  PresignedUrlRequest,
  PresignedUrlResponse,
  DeleteAttachmentResponse,
} from "../types";

export const uploadApi = {
  /**
   * Request a presigned URL for file upload
   */
  getPresignedUrl: async (
    request: PresignedUrlRequest
  ): Promise<PresignedUrlResponse> => {
    const { data } = await api.post<PresignedUrlResponse>(
      `/workspaces/${request.workspaceId}/attachments/generate/presigned-url`,
      request
    );
    return data;
  },

  /**
   * Confirm upload completion
   */
  confirmUpload: async (
    request: ConfirmUploadRequest
  ): Promise<ConfirmUploadResponse> => {
    const { data } = await api.post<ConfirmUploadResponse>(
      `/workspaces/${request.workspaceId}/attachments/${request.attachmentId}/confirm`,
      request
    );
    return data;
  },

  /**
   * Delete an attachment
   */
  deleteAttachment: async (
    request: DeleteAttachmentRequest
  ): Promise<DeleteAttachmentResponse> => {
    const { data } = await api.delete<DeleteAttachmentResponse>(
      `/workspaces/${request.workspaceId}/attachments/${request.attachmentId}`
    );
    return data;
  },
};
