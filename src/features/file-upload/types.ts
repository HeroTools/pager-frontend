export interface PresignedUrlRequest {
  workspaceId: string;
  fileId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  filePurpose:
    | 'attachments'
    | 'profile_pictures'
    | 'channel_documents'
    | 'temp_uploads'
    | 'audio_messages'
    | 'video_messages';
}

export interface PresignedUrlResponse {
  signed_url: string;
  token: string;
  path: string;
  storage_url: string;
  file_id: string;
  expires_in: number;
}

export interface ConfirmUploadRequest {
  workspaceId: string;
  attachmentId: string;
}

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
    storage_url: string;
    status: 'uploading' | 'uploaded' | 'failed' | 'orphaned';
    file_purpose:
      | 'attachments'
      | 'profile_pictures'
      | 'channel_documents'
      | 'temp_uploads'
      | 'audio_messages'
      | 'video_messages';
    created_at: string;
    updated_at: string;
  };
}

export interface DeleteAttachmentRequest {
  workspaceId: string;
  attachmentId: string;
}

export interface DeleteAttachmentResponse {
  success: boolean;
  error?: string;
}

export interface ErrorResponse {
  error: string;
}

export interface UploadedAttachment {
  id: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  storageUrl: string;
  uploadProgress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface ManagedAttachment extends UploadedAttachment {
  file?: File; // Store file for preview during upload
}
