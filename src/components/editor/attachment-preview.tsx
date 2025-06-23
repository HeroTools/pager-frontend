import { ManagedAttachment } from "@/features/file-upload/types";
import { X, Loader2, PlayIcon, FileIcon } from "lucide-react";

const AttachmentPreview = (attachment: ManagedAttachment) => {
  const isImage = attachment.contentType?.startsWith("image/");
  const isVideo = attachment.contentType?.startsWith("video/");
  const isUploading = attachment.status === "uploading";
  const hasError = attachment.status === "error";

  const removeAttachment = async (attachmentId: string) => {
    console.log("Removing attachment", attachmentId);

    const attachment = attachments.find((att) => att.id === attachmentId);
    if (!attachment) return;

    // If it's a completed attachment (has real ID), delete from server
    if (
      attachment.status === "completed" &&
      !attachmentId.startsWith("upload-") &&
      deleteAttachment
    ) {
      try {
        await deleteAttachment(attachmentId, workspaceId);
      } catch (error) {
        console.error("Failed to delete attachment:", error);
      }
    }

    setAttachments((prev) => {
      const newState = prev.filter((att) => att.id !== attachmentId);
      debugLog("After removal", {
        removedId: attachmentId,
        newCount: newState.length,
      });
      return newState;
    });
  };

  return (
    <div
      key={attachment.id}
      className="relative w-16 h-16 bg-muted border border-border rounded-lg overflow-hidden group"
    >
      {/* Remove button */}
      <button
        onClick={() => removeAttachment(attachment.id)}
        className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 text-xs"
      >
        <X className="w-3 h-3" />
      </button>

      {/* Content */}
      <div className="w-full h-full flex items-center justify-center">
        {isUploading && (
          <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-primary mb-1" />
            <span className="text-xs text-muted-foreground">
              {Math.round(attachment.uploadProgress)}%
            </span>
          </div>
        )}

        {hasError && (
          <div className="absolute inset-0 bg-destructive/10 flex items-center justify-center">
            <span className="text-xs text-destructive font-medium">Error</span>
          </div>
        )}

        {isImage && (attachment.file || attachment.publicUrl) && (
          <img
            src={
              attachment.file
                ? URL.createObjectURL(attachment.file)
                : attachment.publicUrl
            }
            alt={attachment.originalFilename}
            className="w-full h-full object-cover"
          />
        )}

        {isVideo && (
          <div className="w-full h-full bg-black/80 flex items-center justify-center">
            <PlayIcon className="w-6 h-6 text-white" />
          </div>
        )}

        {!isImage && !isVideo && (
          <div className="flex flex-col items-center justify-center p-1">
            <FileIcon className="w-4 h-4 text-muted-foreground mb-1" />
            <span className="text-xs text-muted-foreground text-center leading-tight truncate w-full">
              {attachment.originalFilename?.split(".").pop()?.toUpperCase()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
