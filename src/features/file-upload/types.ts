// No changes needed for PresignedUrlRequest
export interface PresignedUrlRequest {
  workspaceId: string;
  fileId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  filePurpose:
    | "attachments"
    | "profile_pictures"
    | "channel_documents"
    | "temp_uploads"
    | "audio_messages"
    | "video_messages";
}

// Updated PresignedUrlResponse based on successResponse directly returning the data object
export interface PresignedUrlResponse {
  signed_url: string;
  token: string;
  path: string; // This is the S3 key
  public_url: string;
  file_id: string;
  expires_in: number;
}

// No changes needed for ConfirmUploadRequest
export interface ConfirmUploadRequest {
  workspaceId: string;
  attachmentId: string;
}

// Updated ConfirmUploadResponse based on successResponse directly returning the data object
export interface ConfirmUploadResponse {
  message: string;
  file: {
    id: string;
    workspace_id: string;
    s3_bucket: string;
    s3_key: string;
    original_filename: string;
    content_type: string;
    size_bytes: number;
    uploaded_by: string;
    public_url: string;
    status: "uploading" | "uploaded" | "failed" | "orphaned";
    file_purpose:
      | "attachments"
      | "profile_pictures"
      | "channel_documents"
      | "temp_uploads"
      | "audio_messages"
      | "video_messages";
    created_at: string;
    updated_at: string;
  };
}

// No changes needed for DeleteAttachmentRequest
export interface DeleteAttachmentRequest {
  workspaceId: string;
  attachmentId: string;
}

// Updated DeleteAttachmentResponse based on successResponse directly returning the body,
// which is { success: true } for a successful delete.
export interface DeleteAttachmentResponse {
  success: boolean; // This will be `true` on success as per backend.
}

// --- Common Error Response Type ---
// This interface represents the structure of the body returned by errorResponse.
export interface ErrorResponse {
  error: string;
  // If you pass errorDetails, they would also be here, e.g.:
  // details?: Record<string, any>;
}

export interface UploadedAttachment {
  id: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  publicUrl: string;
  uploadProgress: number;
  status: "uploading" | "completed" | "error";
  error?: string;
}

export interface ManagedAttachment extends UploadedAttachment {
  file?: File; // Store file for preview during upload
}
