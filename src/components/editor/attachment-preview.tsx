import { FileIcon, Loader2, PlayIcon, X } from 'lucide-react';

import { type ManagedAttachment, useDeleteAttachment } from '@/features/file-upload';

const AttachmentPreview = ({
  attachment,
  attachments,
  workspaceId,
  setAttachments,
}: {
  attachment: ManagedAttachment;
  attachments: ManagedAttachment[];
  workspaceId: string;
  setAttachments: (
    attachments: ManagedAttachment[] | ((prev: ManagedAttachment[]) => ManagedAttachment[]),
  ) => void;
}) => {
  const isImage = attachment.contentType?.startsWith('image/');
  const isVideo = attachment.contentType?.startsWith('video/');
  const isUploading = attachment.status === 'uploading';
  const hasError = attachment.status === 'error';

  const deleteAttachment = useDeleteAttachment();

  const removeAttachment = async (attachmentId: string) => {
    console.log('Removing attachment', attachmentId);

    const attachment = attachments.find((att) => att.id === attachmentId);
    if (!attachment) {
      return;
    }

    if (attachment.status === 'completed' && !attachmentId.startsWith('upload-')) {
      try {
        await deleteAttachment.mutateAsync({
          attachmentId,
          workspaceId,
        });
      } catch (error) {
        console.error('Failed to delete attachment:', error);
      }
    }

    setAttachments((prev) => {
      const newState = prev.filter((att) => att.id !== attachmentId);
      return newState;
    });
  };

  return (
    <div className="relative py-2 pr-2">
      <div
        key={attachment.id}
        className="relative w-16 h-16 bg-muted border border-border rounded-lg overflow-visible group"
      >
        <button
          onClick={() => removeAttachment(attachment.id)}
          className="cursor-pointer absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 shadow-lg hover:scale-110 border-2 border-background"
          aria-label="Remove attachment"
        >
          <X className="w-3 h-3" />
        </button>

        <div className="w-full h-full flex items-center justify-center">
          {isUploading && (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin text-primary mb-1" />
              <span className="text-xs text-muted-foreground">
                {Math.round(attachment.uploadProgress)}%
              </span>
            </div>
          )}

          {hasError && (
            <div className="absolute inset-0 bg-destructive/10 flex items-center justify-center rounded-lg">
              <span className="text-xs text-destructive font-medium">Error</span>
            </div>
          )}

          {isImage && (attachment.file || attachment.publicUrl) && (
            <img
              src={attachment.file ? URL.createObjectURL(attachment.file) : attachment.publicUrl}
              alt={attachment.originalFilename}
              className="w-full h-full object-cover rounded-lg"
            />
          )}

          {isVideo && (
            <div className="w-full h-full bg-black/80 flex items-center justify-center rounded-lg">
              <PlayIcon className="w-6 h-6 text-white" />
            </div>
          )}

          {!isImage && !isVideo && (
            <div className="flex flex-col items-center justify-center p-1">
              <FileIcon className="w-4 h-4 text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground text-center leading-tight truncate w-full">
                {attachment.originalFilename?.split('.').pop()?.toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttachmentPreview;
