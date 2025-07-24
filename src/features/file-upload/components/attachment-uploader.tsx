import React, { useCallback, useState } from 'react';
import type { UploadProgress } from '@/features/file-upload/hooks/use-upload';
import { useDeleteAttachment, useFileUpload } from '@/features/file-upload/hooks/use-upload';
import { v4 as uuidv4 } from 'uuid';
import { X } from 'lucide-react';
import type { UploadedAttachment } from '../types';

interface AttachmentUploaderProps {
  workspaceId: string;
  onAttachmentsChange: (attachments: UploadedAttachment[]) => void;
  maxFiles?: number;
  maxFileSizeBytes?: number;
}

const AttachmentUploader: React.FC<AttachmentUploaderProps> = ({
  workspaceId,
  onAttachmentsChange,
  maxFiles = 10,
  maxFileSizeBytes = 20 * 1024 * 1024, // 20MB default
}) => {
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const { uploadMultipleFiles, isUploading } = useFileUpload(workspaceId);
  const deleteAttachmentMutation = useDeleteAttachment();

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSizeBytes) {
      return `File "${file.name}" is too large. Maximum size is ${Math.round(
        maxFileSizeBytes / 1024 / 1024,
      )}MB.`;
    }

    const allowedTypes = [
      'image/',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument',
      'video/',
      'audio/',
      'text/',
      'application/zip',
    ];

    const isAllowedType = allowedTypes.some((type) => file.type.startsWith(type));
    if (!isAllowedType) {
      return `File type "${file.type}" is not supported.`;
    }

    return null;
  };

  const handleFiles = useCallback(
    async (files: FileList) => {
      const fileArray = Array.from(files);

      if (attachments.length + fileArray.length > maxFiles) {
        alert(`Cannot upload more than ${maxFiles} files total.`);
        return;
      }

      const validationErrors = fileArray
        .map((file) => validateFile(file))
        .filter((error) => error !== null);

      if (validationErrors.length > 0) {
        alert(validationErrors.join('\n'));
        return;
      }

      const initialAttachments: UploadedAttachment[] = fileArray.map((file) => ({
        id: `temp-${uuidv4()}`,
        originalFilename: file.name,
        contentType: file.type,
        sizeBytes: file.size,
        publicUrl: '',
        uploadProgress: 0,
        status: 'uploading',
      }));

      setAttachments((prev) => [...prev, ...initialAttachments]);

      try {
        const results = await uploadMultipleFiles(
          fileArray,
          (fileIndex: number, progress: UploadProgress) => {
            setAttachments((prev) =>
              prev.map((att, index) => {
                if (index === prev.length - fileArray.length + fileIndex) {
                  return {
                    ...att,
                    uploadProgress: progress.percentage,
                  };
                }
                return att;
              }),
            );
          },
        );

        setAttachments((prev) => {
          const newAttachments = prev.map((att, index) => {
            const resultIndex = index - (prev.length - fileArray.length);

            if (resultIndex >= 0 && resultIndex < results.length) {
              const result = results[resultIndex];
              console.log(result, 'result.publicUrl');
              return {
                id: result.attachmentId || att.id,
                originalFilename: att.originalFilename,
                contentType: att.contentType,
                sizeBytes: att.sizeBytes,
                publicUrl: result.publicUrl,
                uploadProgress: 100,
                status: result.status === 'success' ? ('completed' as const) : ('error' as const),
                error: result.error,
              };
            }

            return att;
          });

          const completedAttachments = newAttachments.filter((att) => att.status === 'completed');
          onAttachmentsChange(completedAttachments);

          return newAttachments;
        });
      } catch (error) {
        console.error('Upload failed:', error);

        // Mark all uploading files as failed
        setAttachments((prev) =>
          prev.map((att) =>
            att.status === 'uploading'
              ? { ...att, status: 'error' as const, error: 'Upload failed' }
              : att,
          ),
        );
      }
    },
    [attachments.length, maxFiles, uploadMultipleFiles, onAttachmentsChange],
  );

  const removeAttachment = async (attachmentId: string) => {
    const attachment = attachments.find((att) => att.id === attachmentId);
    if (!attachment) {
      return;
    }

    // If the attachment was successfully uploaded, delete it from the server
    if (attachment.status === 'completed' && !attachmentId.startsWith('temp-')) {
      try {
        await deleteAttachmentMutation.mutateAsync({
          attachmentId,
          workspaceId,
        });
      } catch (error) {
        console.error('Failed to delete attachment:', error);
        // Continue with local removal even if server deletion fails
      }
    }

    setAttachments((prev) => {
      const newAttachments = prev.filter((att) => att.id !== attachmentId);
      const completedAttachments = newAttachments.filter((att) => att.status === 'completed');
      onAttachmentsChange(completedAttachments);
      return newAttachments;
    });
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) {
      return '0 Bytes';
    }
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="w-full mb-4">
      <div
        className={`
          border border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
          ${
            isDragging
              ? 'border-primary bg-accent/50 scale-[1.02]'
              : 'border-border bg-card hover:border-primary hover:bg-accent/30'
          }
          ${isUploading ? 'pointer-events-none opacity-75' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isUploading && document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          multiple
          className="hidden"
          disabled={isUploading}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <div className="space-y-4">
          <p className="text-foreground">
            {isUploading ? 'Uploading files...' : 'Drop files here or click to browse'}
          </p>
          <p className="text-sm text-muted-foreground">
            Max {maxFiles} files, up to {Math.round(maxFileSizeBytes / 1024 / 1024)}MB each
          </p>
        </div>
      </div>

      {attachments.length > 0 && (
        <div className="mt-4 space-y-4">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-4 p-4 bg-card border border-border rounded-md">
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {attachment.originalFilename}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.sizeBytes)}
                </div>
              </div>

              {attachment.status === 'uploading' && (
                <div className="flex-1 mx-4">
                  <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-200 ease-out"
                      style={{ width: `${attachment.uploadProgress}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {Math.round(attachment.uploadProgress)}%
                  </div>
                </div>
              )}

              {attachment.status === 'error' && (
                <div className="flex-1 mx-4 text-xs text-destructive">{attachment.error}</div>
              )}

              {attachment.status === 'completed' && (
                <div className="flex-1 mx-4 text-xs text-accent-success">✓ Uploaded</div>
              )}

              <button
                onClick={() => removeAttachment(attachment.id)}
                disabled={deleteAttachmentMutation.isPending}
                className="flex items-center justify-center w-6 h-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors disabled:opacity-50"
              >
                <X />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AttachmentUploader;
