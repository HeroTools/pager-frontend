import { FC, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import EmojiPicker from "@/components/emoji-picker";
import {
  MoreHorizontal,
  MessageSquare,
  Smile,
  Edit,
  Trash2,
  Download,
  File,
  Music,
  Image as ImageIcon,
  Play,
  Eye,
} from "lucide-react";
import { Message, Attachment } from "@/types/chat";
import { cn } from "@/lib/utils";
import { getFileIcon } from "@/lib/helpers";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageReactions } from "./message-reactions";
import { MessageContent } from "./message-content";
import { useUIStore } from "@/store/ui-store";
import { MediaViewerModal } from "@/components/media-viewer-modal";
import { CurrentUser } from "@/features/auth/types";
import { useGetMembers } from "@/features/members";
import { useParamIds } from "@/hooks/use-param-ids";
import ThreadButton from "./thread-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ATTACHMENT_SIZES = {
  SINGLE: { maxHeight: 300, maxWidth: 400 },
  MULTI: { maxHeight: 250, maxWidth: 250, fixedHeight: 250 },
} as const;

interface ChatMessageProps {
  message: Message;
  currentUser: CurrentUser;
  hideReplies?: boolean;
  isCompact?: boolean;
  showAvatar?: boolean;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (messageId: string) => void;
  onReaction: (messageId: string, emoji: string) => void;
}

const ImageAttachment: FC<{
  attachment: Attachment;
  onOpenMediaViewer: () => void;
  isSingle?: boolean;
  fixedHeight?: number;
}> = ({ attachment, onOpenMediaViewer, isSingle = false, fixedHeight }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const { maxHeight, maxWidth } = isSingle
    ? ATTACHMENT_SIZES.SINGLE
    : ATTACHMENT_SIZES.MULTI;
  const filename = attachment.originalFilename || "Uploaded image";

  return (
    <div className="relative group/image flex-shrink-0">
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-muted animate-pulse rounded-lg flex items-center justify-center min-h-[120px]">
          <ImageIcon className="w-8 h-8 text-muted-foreground" />
        </div>
      )}
      {hasError ? (
        <div className="bg-muted rounded-lg p-4 flex items-center gap-2 text-muted-foreground min-h-[120px]">
          <ImageIcon className="w-5 h-5" />
          <span className="text-sm">Failed to load image</span>
        </div>
      ) : (
        <img
          src={attachment.publicUrl}
          alt={filename || "Uploaded image"}
          className={cn(
            "rounded-lg cursor-pointer hover:opacity-90 transition-opacity border",
            fixedHeight ? "object-cover" : "object-contain",
            !isLoaded && "opacity-0"
          )}
          style={{
            height: fixedHeight ? `${fixedHeight}px` : "auto",
            maxHeight: fixedHeight ? "none" : `${maxHeight}px`,
            maxWidth: `${maxWidth}px`,
            minWidth: fixedHeight ? "120px" : "auto",
          }}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          onClick={onOpenMediaViewer}
          loading="lazy"
        />
      )}
      <div className="absolute top-2 right-2 opacity-0 group-hover/image:opacity-100 transition-opacity">
        <Button
          variant="secondary"
          size="sm"
          className="h-8 w-8 p-0 bg-card/30 hover:bg-card/40 border-0"
          onClick={(e) => {
            e.stopPropagation();
            window.open(attachment.publicUrl, "_blank");
          }}
        >
          <Download className="w-4 h-4 text-white" />
        </Button>
      </div>
    </div>
  );
};

const VideoAttachment: FC<{
  attachment: Attachment;
  onOpenMediaViewer: () => void;
  isSingle?: boolean;
  fixedHeight?: number;
}> = ({ attachment, onOpenMediaViewer, isSingle = false, fixedHeight }) => {
  const [duration, setDuration] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const { maxHeight, maxWidth } = isSingle ? ATTACHMENT_SIZES.SINGLE : ATTACHMENT_SIZES.MULTI;

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (
      video.duration &&
      !isNaN(video.duration) &&
      video.duration !== Infinity
    ) {
      setDuration(formatDuration(video.duration));
    }
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  return (
    <div
      className="relative group/video flex-shrink-0 cursor-pointer"
      onClick={onOpenMediaViewer}
    >
      {/* Placeholder while loading to prevent layout shift */}
      {!isLoaded && !hasError && (
        <div className="bg-muted rounded-lg flex items-center justify-center min-h-[200px] aspect-video">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Play className="w-8 h-8" />
            <span className="text-sm">Loading video...</span>
          </div>
        </div>
      )}

      {hasError ? (
        <div className="bg-muted rounded-lg p-4 flex items-center gap-2 text-muted-foreground min-h-[200px] aspect-video justify-center">
          <Play className="w-5 h-5" />
          <span className="text-sm">Failed to load video</span>
        </div>
      ) : (
        <video
          src={attachment.publicUrl}
          className={cn(
            "rounded-lg cursor-pointer border",
            fixedHeight ? "object-cover" : "object-contain",
            !isLoaded && "opacity-0 absolute inset-0"
          )}
          style={{
            height: fixedHeight ? `${fixedHeight}px` : 'auto',
            maxHeight: fixedHeight ? 'none' : `${maxHeight}px`,
            maxWidth: `${maxWidth}px`,
            minWidth: fixedHeight ? "120px" : 'auto'
          }}
          preload="metadata"
          onLoadedMetadata={handleLoadedMetadata}
          onError={handleError}
        >
          Your browser does not support the video tag.
        </video>
      )}
      
      {/* Video overlay with play icon and duration - only show when loaded */}
      {isLoaded && !hasError && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
          <Play className="w-3 h-3 fill-current" />
          {duration && <span>{duration}</span>}
        </div>
      )}

      <div className="absolute top-2 right-2 opacity-0 group-hover/video:opacity-100 transition-opacity">
        <Button
          variant="secondary"
          size="sm"
          className="h-8 w-8 p-0 bg-black/20 hover:bg-black/40 border-0"
          onClick={(e) => {
            e.stopPropagation();
            window.open(attachment.publicUrl, "_blank");
          }}
        >
          <Download className="w-4 h-4 text-white" />
        </Button>
      </div>
    </div>
  );
};

const AudioAttachment: FC<{ attachment: Attachment }> = ({ attachment }) => {
  return (
    <div className="bg-muted rounded-lg p-3 max-w-sm">
      <div className="flex items-center gap-3 mb-2">
        <Music className="w-5 h-5 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {attachment.originalFilename || "Audio file"}
          </p>
          {attachment.sizeBytes && (
            <p className="text-xs text-muted-foreground">
              {formatFileSize(attachment.sizeBytes)}
            </p>
          )}
        </div>
      </div>
      <audio
        src={attachment.publicUrl}
        className="w-full"
        controls
        preload="metadata"
      >
        Your browser does not support the audio tag.
      </audio>
    </div>
  );
};

const DocumentAttachment: FC<{
  attachment: Attachment;
  onOpenMediaViewer: () => void;
}> = ({ attachment, onOpenMediaViewer }) => {
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  const getFileColor = (filename: string) => {
    const extension = filename.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "pdf":
        return "border-red-200";
      case "doc":
      case "docx":
        return "border-blue-200";
      case "xls":
      case "xlsx":
        return "border-green-200";
      case "ppt":
      case "pptx":
        return "border-orange-200";
      default:
        return "border-border";
    }
  };

  const isViewableDocument = (filename: string) => {
    const extension = filename.split(".").pop()?.toLowerCase();
    return ["pdf", "doc", "docx", "xls", "xlsx"].includes(extension || "");
  };

  const getPreviewUrl = (attachment: Attachment) => {
    const extension = attachment.originalFilename
      ?.split(".")
      .pop()
      ?.toLowerCase();

    if (extension === "pdf") {
      // For PDFs, use simple embedded view
      return `${attachment.publicUrl}#toolbar=0`;
    }

    if (
      ["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(extension || "")
    ) {
      // Use Microsoft Office Online viewer for thumbnails
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
        attachment.publicUrl
      )}`;
    }

    return null;
  };

  const previewUrl = getPreviewUrl(attachment);

  return (
    <div className="relative group/document max-w-sm">
      <div
        className={cn(
          "rounded-lg border-2 bg-background cursor-pointer hover:shadow-md transition-all overflow-hidden",
          getFileColor(attachment.originalFilename || "")
        )}
        onClick={
          isViewableDocument(attachment.originalFilename || "")
            ? onOpenMediaViewer
            : () => window.open(attachment.publicUrl, "_blank")
        }
      >
        {/* File info header */}
        <div className="p-3 pb-2">
          <div className="flex items-center gap-2 mb-1">
            {getFileIcon(attachment.originalFilename || "")}
            <p className="text-sm font-medium truncate flex-1">
              {attachment.originalFilename || "Document"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase">
              {attachment.originalFilename?.split(".").pop() || "FILE"}
            </span>
            {attachment.sizeBytes && (
              <>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.sizeBytes)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Preview thumbnail underneath */}
        <div className="h-36 bg-muted relative overflow-hidden rounded-b-lg">
          {previewUrl &&
          isViewableDocument(attachment.originalFilename || "") &&
          !previewError ? (
            <>
              {!previewLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="w-8 h-8 opacity-50">
                    {getFileIcon(attachment.originalFilename || "")}
                  </div>
                </div>
              )}
              <iframe
                src={previewUrl}
                className={cn(
                  "w-full h-full border-0 pointer-events-none",
                  !previewLoaded && "opacity-0"
                )}
                style={
                  attachment.originalFilename?.toLowerCase().includes(".doc")
                    ? {
                        width: "200%",
                        height: "200%",
                        transform: "scale(0.6)",
                        transformOrigin: "-30px -40px",
                      }
                    : undefined
                }
                onLoad={() => setPreviewLoaded(true)}
                onError={() => setPreviewError(true)}
              />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="w-8 h-8 opacity-50">
                {getFileIcon(attachment.originalFilename || "")}
              </div>
            </div>
          )}
        </div>

        {/* Download button */}
        <div className="absolute top-2 right-2 opacity-0 group-hover/document:opacity-100 transition-opacity">
          <Button
            variant="secondary"
            size="sm"
            className="h-6 w-6 p-0 bg-background/80 hover:bg-background border-0"
            onClick={(e) => {
              e.stopPropagation();
              window.open(attachment.publicUrl, "_blank");
            }}
          >
            <Download className="w-3 h-3 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const GenericAttachment: FC<{ attachment: Attachment }> = ({ attachment }) => {
  return (
    <div
      className="bg-muted rounded-lg p-3 max-w-sm hover:bg-muted/80 transition-colors cursor-pointer"
      onClick={() => window.open(attachment.publicUrl, "_blank")}
    >
      <div className="flex items-center gap-3">
        <File className="w-5 h-5 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {attachment.originalFilename || "File"}
          </p>
          {attachment.sizeBytes && (
            <p className="text-xs text-muted-foreground">
              {formatFileSize(attachment.sizeBytes)}
            </p>
          )}
        </div>
        <Download className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  );
};

const AttachmentGrid: FC<{
  attachments: Attachment[];
  onOpenMediaViewer: (attachments: Attachment[], initialIndex: number) => void;
}> = ({ attachments, onOpenMediaViewer }) => {
  const renderAttachment = (
    attachment: Attachment,
    index: number,
    isSingle = false,
    fixedHeight?: number
  ) => {
    const mimeType = attachment.contentType || "";
    const filename = attachment.originalFilename || "";

    if (mimeType.startsWith("image/")) {
      return (
        <ImageAttachment
          key={attachment.id}
          attachment={attachment}
          onOpenMediaViewer={() => onOpenMediaViewer(attachments, index)}
          isSingle={isSingle}
          fixedHeight={fixedHeight}
        />
      );
    }

    if (mimeType.startsWith("video/")) {
      return (
        <VideoAttachment
          key={attachment.id}
          attachment={attachment}
          onOpenMediaViewer={() => onOpenMediaViewer(attachments, index)}
          isSingle={isSingle}
          fixedHeight={fixedHeight}
        />
      );
    }

    if (mimeType.startsWith("audio/")) {
      return <AudioAttachment key={attachment.id} attachment={attachment} />;
    }

    if (
      mimeType.includes("pdf") ||
      mimeType.includes("document") ||
      mimeType.includes("spreadsheet") ||
      mimeType.includes("presentation") ||
      filename.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i)
    ) {
      return (
        <DocumentAttachment
          key={attachment.id}
          attachment={attachment}
          onOpenMediaViewer={() => onOpenMediaViewer(attachments, index)}
        />
      );
    }

    return <GenericAttachment key={attachment.id} attachment={attachment} />;
  };

  if (attachments.length === 0) return null;

  const isSingleAttachment = attachments.length === 1;
  
  // Use fixed height for multi-attachment layout to align all media
  const fixedHeight = isSingleAttachment ? undefined : ATTACHMENT_SIZES.MULTI.fixedHeight;

  return (
    <div className="mt-2">
      {isSingleAttachment ? (
        <div className="flex justify-start">
          {renderAttachment(attachments[0], 0, true)}
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-1.5 max-w-5xl">
          {attachments.map((attachment, index) =>
            renderAttachment(attachment, index, false, fixedHeight)
          )}
        </div>
      )}
    </div>
  );
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const ChatMessage: FC<ChatMessageProps> = ({
  message,
  currentUser,
  hideReplies = false,
  isCompact = false,
  showAvatar = true,
  onEdit,
  onDelete,
  onReply,
  onReaction,
}) => {
  const { workspaceId } = useParamIds();
  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false);
  const [mediaViewerAttachments, setMediaViewerAttachments] = useState<
    Attachment[]
  >([]);
  const [mediaViewerInitialIndex, setMediaViewerInitialIndex] = useState(0);
  const {
    openEmojiPickerMessageId,
    setEmojiPickerOpen,
    openThreadMessageId,
    setThreadOpen,
  } = useUIStore();
  const getMembers = useGetMembers(workspaceId);

  const isOwnMessage = message.authorId === currentUser.id;

  const isEmojiPickerOpen = openEmojiPickerMessageId === message.id;

  const handleEmojiSelect = (emoji: string) => {
    onReaction?.(message.id, emoji);
    setEmojiPickerOpen(null);
  };

  const handleEmojiPickerToggle = (open: boolean) => {
    setEmojiPickerOpen(open ? message.id : null);
  };

  const handleOpenMediaViewer = (
    attachments: Attachment[],
    initialIndex: number
  ) => {
    setMediaViewerAttachments(attachments);
    setMediaViewerInitialIndex(initialIndex);
    setIsMediaViewerOpen(true);
  };

  return (
    <>
      <div
        className={cn(
          "group relative px-4 hover:bg-message-hover transition-colors py-2",
          isCompact && "-mt-1"
        )}
      >
        <div className="flex gap-3">
          {showAvatar && !isCompact ? (
            <Avatar className="w-9 h-9 flex-shrink-0">
              <AvatarImage src={message.author.avatar} />
              <AvatarFallback className="text-sm">
                {message.author.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-9 flex-shrink-0 flex justify-center items-start pt-0.5">
              {isCompact && (
                <span className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors opacity-0 group-hover:opacity-100">
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          )}

          <div className="flex-1 min-w-0">
            {!isCompact && (
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="font-semibold text-foreground hover:underline cursor-pointer leading-tight">
                  {message.author.name}
                </span>
                <span className="text-xs text-muted-foreground leading-tight">
                  {formatDistanceToNow(new Date(message.timestamp), {
                    addSuffix: true,
                  })}
                </span>
                {message.isEdited && (
                  <span className="text-xs text-text-subtle leading-tight">
                    (edited)
                  </span>
                )}
              </div>
            )}

            <div className={cn("leading-relaxed", !isCompact && "mt-0")}>
              <MessageContent content={message.content} />
            </div>

            {message.attachments && message.attachments.length > 0 && (
              <AttachmentGrid
                attachments={message.attachments}
                onOpenMediaViewer={handleOpenMediaViewer}
              />
            )}

            {message?.reactions && message.reactions?.length > 0 ? (
              <MessageReactions
                reactions={message.reactions}
                onReaction={(emoji) => onReaction?.(message.id, emoji)}
                currentUserId={currentUser.id}
              />
            ) : null}

            {message?.threadCount &&
            Number(message.threadCount) > 0 &&
            !hideReplies ? (
              <ThreadButton message={message} members={getMembers.data!} />
            ) : null}
          </div>
        </div>

        {/* Show toolbar on hover (CSS) or when emoji picker is open (JS state) */}
        <div className={cn(
          "absolute top-0 right-4 bg-card border border-border-subtle rounded-lg shadow-sm transition-opacity",
          isEmojiPickerOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}>
          <div className="flex items-center">
            <EmojiPicker
              open={isEmojiPickerOpen}
              onOpenChange={handleEmojiPickerToggle}
              onSelect={handleEmojiSelect}
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-sidebar-hover"
                >
                  <Smile className="w-4 h-4" />
                </Button>
              }
            />

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-sidebar-hover"
              onClick={() => setThreadOpen(message)}
            >
              <MessageSquare className="w-4 h-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-sidebar-hover"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isOwnMessage && (
                  <>
                    <DropdownMenuItem onClick={() => onEdit?.(message.id)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit message
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete?.(message.id)}
                      className="text-text-destructive hover:text-text-destructive/80"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete message
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <MediaViewerModal
        isOpen={isMediaViewerOpen}
        onClose={() => setIsMediaViewerOpen(false)}
        attachments={mediaViewerAttachments}
        initialIndex={mediaViewerInitialIndex}
      />
    </>
  );
};
