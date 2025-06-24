import { FC, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import {
  MoreHorizontal,
  MessageSquare,
  Smile,
  Edit,
  Trash2,
  Download,
  File,
  FileText,
  Music,
  Archive,
  Image as ImageIcon,
  Play,
} from "lucide-react";
import { Message, User, Attachment } from "@/types/chat";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageReactions } from "./message-reactions";
import { MessageContent } from "./message-content";
import { useUIStore } from "@/store/ui-store";
import { MediaViewerModal } from "@/components/media-viewer-modal";

interface ChatMessageProps {
  message: Message;
  currentUser: User;
  isCompact?: boolean;
  showAvatar?: boolean;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (messageId: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  onOpenMediaViewer?: (message: Message, attachmentIndex: number) => void;
}

const ImageAttachment: FC<{ attachment: Attachment; onOpenMediaViewer: () => void }> = ({ attachment, onOpenMediaViewer }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="relative group/image max-w-sm">
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-muted animate-pulse rounded-lg flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-muted-foreground" />
        </div>
      )}
      {hasError ? (
        <div className="bg-muted rounded-lg p-4 flex items-center gap-2 text-muted-foreground">
          <ImageIcon className="w-5 h-5" />
          <span className="text-sm">Failed to load image</span>
        </div>
      ) : (
        <img
          src={attachment.public_url}
          alt={attachment.original_filename || "Uploaded image"}
          className={cn(
            "rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity",
            !isLoaded && "opacity-0"
          )}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          loading="lazy"
          onClick={onOpenMediaViewer}
        />
      )}
      <div className="absolute top-2 right-2 opacity-0 group-hover/image:opacity-100 transition-opacity">
        <Button
          variant="secondary"
          size="sm"
          className="h-8 w-8 p-0 bg-card/30 hover:bg-card/40 border-0"
          onClick={(e) => {
            e.stopPropagation();
            window.open(attachment.public_url, "_blank");
          }}
        >
          <Download className="w-4 h-4 text-white" />
        </Button>
      </div>
    </div>
  );
};

const VideoAttachment: FC<{ attachment: Attachment; onOpenMediaViewer: () => void }> = ({ attachment, onOpenMediaViewer }) => {
  const [duration, setDuration] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState(false);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video.duration && !isNaN(video.duration) && video.duration !== Infinity) {
      setDuration(formatDuration(video.duration));
    }
    setIsLoaded(true);
  };

  return (
    <div className="relative group/video max-w-md cursor-pointer" onClick={onOpenMediaViewer}>
      <video
        src={attachment.public_url}
        className="rounded-lg max-w-full h-auto"
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
      >
        Your browser does not support the video tag.
      </video>
      
      {/* Video overlay with play icon and duration */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
        <Play className="w-3 h-3 fill-current" />
        {duration && <span>{duration}</span>}
      </div>

      <div className="absolute top-2 right-2 opacity-0 group-hover/video:opacity-100 transition-opacity">
        <Button
          variant="secondary"
          size="sm"
          className="h-8 w-8 p-0 bg-card/30 hover:bg-card/40 border-0"
          onClick={(e) => {
            e.stopPropagation();
            window.open(attachment.public_url, "_blank");
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
            {attachment.original_filename || "Audio file"}
          </p>
          {attachment.size_bytes && (
            <p className="text-xs text-muted-foreground">
              {formatFileSize(attachment.size_bytes)}
            </p>
          )}
        </div>
      </div>
      <audio
        src={attachment.public_url}
        className="w-full"
        controls
        preload="metadata"
      >
        Your browser does not support the audio tag.
      </audio>
    </div>
  );
};

const DocumentAttachment: FC<{ attachment: Attachment }> = ({ attachment }) => {
  const getFileIcon = (filename: string) => {
    const extension = filename.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "pdf":
        return <FileText className="w-5 h-5 text-red-500" />;
      case "doc":
      case "docx":
        return <FileText className="w-5 h-5 text-blue-500" />;
      case "xls":
      case "xlsx":
        return <FileText className="w-5 h-5 text-green-500" />;
      case "ppt":
      case "pptx":
        return <FileText className="w-5 h-5 text-orange-500" />;
      case "zip":
      case "rar":
      case "7z":
        return <Archive className="w-5 h-5 text-purple-500" />;
      default:
        return <File className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div
      className="bg-muted rounded-lg p-3 max-w-sm hover:bg-muted/80 transition-colors cursor-pointer"
      onClick={() => window.open(attachment.public_url, "_blank")}
    >
      <div className="flex items-center gap-3">
        {getFileIcon(attachment.original_filename || "")}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {attachment.original_filename || "Document"}
          </p>
          {attachment.size_bytes && (
            <p className="text-xs text-muted-foreground">
              {formatFileSize(attachment.size_bytes)}
            </p>
          )}
        </div>
        <Download className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  );
};

// Generic File Attachment Component
const GenericAttachment: FC<{ attachment: Attachment }> = ({ attachment }) => {
  return (
    <div
      className="bg-muted rounded-lg p-3 max-w-sm hover:bg-muted/80 transition-colors cursor-pointer"
      onClick={() => window.open(attachment.public_url, "_blank")}
    >
      <div className="flex items-center gap-3">
        <File className="w-5 h-5 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {attachment.original_filename || "File"}
          </p>
          {attachment.size_bytes && (
            <p className="text-xs text-muted-foreground">
              {formatFileSize(attachment.size_bytes)}
            </p>
          )}
        </div>
        <Download className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  );
};

const AttachmentGrid: FC<{ attachments: Attachment[]; onOpenMediaViewer: (attachment: Attachment, index: number) => void }> = ({ attachments, onOpenMediaViewer }) => {
  const renderAttachment = (attachment: Attachment, index: number) => {
    const mimeType = attachment.content_type || "";
    const filename = attachment.original_filename || "";

    if (mimeType.startsWith("image/")) {
      return <ImageAttachment key={attachment.id} attachment={attachment} onOpenMediaViewer={() => onOpenMediaViewer(attachment, index)} />;
    }

    if (mimeType.startsWith("video/")) {
      return <VideoAttachment key={attachment.id} attachment={attachment} onOpenMediaViewer={() => onOpenMediaViewer(attachment, index)} />;
    }

    if (mimeType.startsWith("audio/")) {
      return <AudioAttachment key={attachment.id} attachment={attachment} />;
    }

    // Document types
    if (
      mimeType.includes("pdf") ||
      mimeType.includes("document") ||
      mimeType.includes("spreadsheet") ||
      mimeType.includes("presentation") ||
      filename.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i)
    ) {
      return <DocumentAttachment key={attachment.id} attachment={attachment} />;
    }

    // Fallback to generic file
    return <GenericAttachment key={attachment.id} attachment={attachment} />;
  };

  if (attachments.length === 0) return null;

  return (
    <div className="mt-2">
      {attachments.length === 1 ? (
        renderAttachment(attachments[0], 0)
      ) : (
        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 max-w-2xl">
          {attachments.map((attachment, index) => renderAttachment(attachment, index))}
        </div>
      )}
    </div>
  );
};

// Helper function to format file sizes
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
  isCompact = false,
  showAvatar = true,
  onEdit,
  onDelete,
  onReply,
  onReaction,
  onOpenMediaViewer,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const { openEmojiPickerMessageId, setEmojiPickerOpen } = useUIStore();
  const isOwnMessage = message.authorId === currentUser.id;

  const isEmojiPickerOpen = openEmojiPickerMessageId === message.id;

  const handleEmojiSelect = (emoji: string) => {
    onReaction?.(message.id, emoji);
    setEmojiPickerOpen(null);
  };

  const handleEmojiPickerToggle = (open: boolean) => {
    setEmojiPickerOpen(open ? message.id : null);
  };

  const handleOpenMediaViewer = (attachment: Attachment, index: number) => {
    onOpenMediaViewer?.(message, index);
  };

  const shouldShowActions = isHovered || isEmojiPickerOpen;

  return (
    <div
      className={cn(
        "group relative px-4 hover:bg-message-hover transition-colors",
        isCompact ? "py-0.5" : "py-2"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
            <AttachmentGrid attachments={message.attachments} onOpenMediaViewer={handleOpenMediaViewer} />
          )}

          {message?.reactions && message.reactions?.length > 0 ? (
            <MessageReactions
              reactions={message.reactions}
              onReaction={(emoji) => onReaction?.(message.id, emoji)}
              currentUserId={currentUser.id}
            />
          ) : null}

          {message?.threadCount && Number(message.threadCount) > 0 ? (
            <button
              onClick={() => onReply?.(message.id)}
              className="mt-2 flex items-center gap-1 text-xs text-text-accent hover:text-text-accent/80 hover:underline transition-colors"
            >
              <MessageSquare className="w-3 h-3" />
              {message.threadCount}{" "}
              {message.threadCount === 1 ? "reply" : "replies"}
            </button>
          ) : null}
        </div>
      </div>

      {/* Message Actions */}
      {shouldShowActions && (
        <div className="absolute top-0 right-4 bg-card border border-border-subtle rounded-lg shadow-sm">
          <div className="flex items-center">
            {/* Emoji Picker Popover */}
            <Popover
              open={isEmojiPickerOpen}
              onOpenChange={handleEmojiPickerToggle}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-sidebar-hover"
                >
                  <Smile className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="p-0 w-auto border-0 shadow-lg"
                align="end"
                side="top"
                sideOffset={8}
              >
                <Picker
                  data={data}
                  onEmojiSelect={(emoji: any) =>
                    handleEmojiSelect(emoji.native)
                  }
                  theme="light"
                  set="native"
                  previewPosition="none"
                  skinTonePosition="none"
                  maxFrequentRows={2}
                  perLine={8}
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-sidebar-hover"
              onClick={() => onReply?.(message.id)}
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
      )}
    </div>
  );
};
