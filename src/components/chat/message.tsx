import { formatDistanceToNow } from 'date-fns';
import {
  Download,
  Edit,
  File,
  Image as ImageIcon,
  MessageSquare,
  MoreHorizontal,
  Music,
  Play,
  Smile,
  Trash2,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import type { Delta, Op } from 'quill';
import { type FC, useEffect, useRef, useState } from 'react';

import { DeleteMessageModal } from '@/components/delete-message-modal';
import EmojiPicker from '@/components/emoji-picker';
import { MediaViewerModal } from '@/components/media-viewer-modal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import InlineThinkingStatus from '@/features/agents/components/inline-thinking-status';
import type { CurrentUser } from '@/features/auth/types';
import { useSignedUrl } from '@/features/file-upload/hooks/use-attachments';
import { useGetMembers } from '@/features/members';
import { parseMessageContent } from '@/features/messages/helpers';
import type { QuillDelta } from '@/features/messages/types';
import { useParamIds } from '@/hooks/use-param-ids';
import { getFileIcon } from '@/lib/helpers';
import { getProxiedUrl } from '@/lib/helpers/proxied-url';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import type { Attachment, Message } from '@/types/chat';
import { MessageContent } from './message-content';
import { MessageReactions } from './message-reactions';
import ThreadButton from './thread-button';

const downloadFile = async (storageUrl: string, filename: string) => {
  try {
    const proxiedUrl = getProxiedUrl(storageUrl);
    const response = await fetch(proxiedUrl);

    if (!response.ok) throw new Error('Download failed');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download failed:', error);
    // Fallback to opening in new tab
    const proxiedUrl = getProxiedUrl(storageUrl);
    window.open(proxiedUrl, '_blank');
  }
};

const ATTACHMENT_CONFIG = {
  SINGLE: {
    image: {
      maxWidthClass: 'max-w-md',
      maxHeightClass: 'max-h-96',
    },
    video: {
      maxWidth: 'max-w-md',
      maxHeight: 'max-h-96',
      height: 'h-auto',
      aspectRatio: 'auto',
    },
  },
  MULTI: {
    image: {
      widthClass: 'w-48',
      heightClass: 'h-32',
    },
    video: {
      maxWidth: 'w-48',
      maxHeight: 'h-32',
      height: 'h-32',
      aspectRatio: '3/2',
    },
  },
  THREAD: {
    image: {
      widthClass: 'w-40',
      heightClass: 'h-28',
    },
    video: {
      maxWidth: 'w-40',
      maxHeight: 'h-28',
      height: 'h-28',
      aspectRatio: '3/2',
    },
  },
} as const;

interface ImageAttachmentProps {
  attachment: Attachment;
  onOpenMediaViewer: () => void;
  isSingle?: boolean;
  isThread?: boolean;
  priority?: boolean;
}

const Editor = dynamic(() => import('@/components/editor/editor'), {
  ssr: false,
});

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const getAttachmentConfig = (isSingle: boolean, isThread: boolean) => {
  if (isThread) return ATTACHMENT_CONFIG.THREAD;
  return isSingle ? ATTACHMENT_CONFIG.SINGLE : ATTACHMENT_CONFIG.MULTI;
};

export const ImageAttachment: FC<ImageAttachmentProps> = ({
  attachment,
  onOpenMediaViewer,
  isSingle = false,
  isThread = false,
  priority = false,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [dimensions, setDimensions] = useState<{ width?: number; height?: number }>({});

  const filename = attachment.originalFilename || 'Uploaded image';
  const proxiedUrl = getProxiedUrl(attachment.storageUrl || '');
  const hasValidUrl = !!proxiedUrl;

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    setIsLoaded(true);
  };

  const getOptimalDimensions = () => {
    if (isSingle) {
      const maxWidth = 384; // max-w-md equivalent
      const maxHeight = 384; // max-h-96 equivalent

      if (dimensions.width && dimensions.height) {
        const aspectRatio = dimensions.width / dimensions.height;
        if (dimensions.width > maxWidth || dimensions.height > maxHeight) {
          if (aspectRatio > 1) {
            return {
              width: Math.min(maxWidth, dimensions.width),
              height: Math.min(maxWidth / aspectRatio, maxHeight),
            };
          } else {
            return {
              width: Math.min(maxHeight * aspectRatio, maxWidth),
              height: Math.min(maxHeight, dimensions.height),
            };
          }
        }
      }
      return {
        width: Math.min(dimensions.width || maxWidth, maxWidth),
        height: Math.min(dimensions.height || maxHeight, maxHeight),
      };
    }

    // For multi/thread, use fixed dimensions
    return isThread ? { width: 160, height: 112 } : { width: 192, height: 128 };
  };

  const optimalDims = getOptimalDimensions();

  if (isSingle) {
    const { maxWidthClass, maxHeightClass } = ATTACHMENT_CONFIG.SINGLE.image;
    return (
      <div
        className={cn(
          'relative group/image rounded-lg overflow-hidden border bg-muted cursor-pointer hover:opacity-90 transition-opacity',
          maxWidthClass,
          maxHeightClass,
        )}
        onClick={hasValidUrl ? onOpenMediaViewer : undefined}
        style={isLoaded ? { width: optimalDims.width, height: optimalDims.height } : undefined}
      >
        {!isLoaded && !hasError && hasValidUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
          </div>
        )}

        {hasError || !hasValidUrl ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted text-muted-foreground gap-2">
            <ImageIcon className="w-8 h-8" />
            <span className="text-sm">Failed to load</span>
          </div>
        ) : (
          <img
            src={proxiedUrl}
            alt={filename}
            width={optimalDims.width}
            height={optimalDims.height}
            className={cn('object-contain transition-opacity', !isLoaded && 'opacity-0')}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={handleImageLoad}
            onError={() => setHasError(true)}
          />
        )}

        <div className="absolute top-2 right-2 opacity-0 group-hover/image:opacity-100 transition-opacity">
          <Button
            variant="secondary"
            size="sm"
            className="h-8 w-8 p-0 bg-black/20 hover:bg-black/40 border-0"
            onClick={(e) => {
              e.stopPropagation();
              downloadFile(attachment.storageUrl || '', filename);
            }}
          >
            <Download className="w-4 h-4 text-white" />
          </Button>
        </div>
      </div>
    );
  }

  const cfg = isThread ? ATTACHMENT_CONFIG.THREAD.image : ATTACHMENT_CONFIG.MULTI.image;
  const { widthClass, heightClass } = cfg;

  return (
    <div
      className={cn(
        'relative group/image rounded-lg overflow-hidden border bg-muted cursor-pointer hover:opacity-90 transition-opacity flex-shrink-0',
        widthClass,
        heightClass,
      )}
      onClick={hasValidUrl ? onOpenMediaViewer : undefined}
    >
      {!isLoaded && !hasError && hasValidUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <ImageIcon className="w-8 h-8 text-muted-foreground" />
        </div>
      )}

      {hasError || !hasValidUrl ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted text-muted-foreground gap-2">
          <ImageIcon className="w-8 h-8" />
          <span className="text-sm">Failed to load</span>
        </div>
      ) : (
        <img
          src={proxiedUrl}
          alt={filename}
          width={optimalDims.width}
          height={optimalDims.height}
          className={cn('object-cover transition-opacity', !isLoaded && 'opacity-0')}
          loading="lazy"
          decoding="async"
          onLoad={handleImageLoad}
          onError={() => setHasError(true)}
        />
      )}

      <div className="absolute top-2 right-2 opacity-0 group-hover/image:opacity-100 transition-opacity">
        <Button
          variant="secondary"
          size="sm"
          className="h-8 w-8 p-0 bg-black/20 hover:bg-black/40 border-0"
          onClick={(e) => {
            e.stopPropagation();
            downloadFile(attachment.storageUrl || '', filename);
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
  isThread?: boolean;
}> = ({ attachment, onOpenMediaViewer, isSingle = false, isThread = false }) => {
  const [duration, setDuration] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const config = getAttachmentConfig(isSingle, isThread);
  const proxiedUrl = getProxiedUrl(attachment.storageUrl || '');

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
    <div className="relative group/video">
      <div
        className={cn(
          'relative rounded-lg overflow-hidden border bg-muted cursor-pointer hover:opacity-90 transition-opacity',
          config.video.maxWidth,
          config.video.maxHeight,
          config.video.height,
        )}
        onClick={onOpenMediaViewer}
        style={{ aspectRatio: config.video.aspectRatio }}
      >
        {!isLoaded && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Play className="w-8 h-8" />
              <span className="text-sm">Loading...</span>
            </div>
          </div>
        )}

        {hasError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Play className="w-8 h-8" />
              <span className="text-sm">Failed to load</span>
            </div>
          </div>
        ) : (
          <video
            src={proxiedUrl}
            className={cn(
              'w-full h-full object-cover transition-opacity',
              !isLoaded && 'opacity-0',
            )}
            preload="metadata"
            onLoadedMetadata={handleLoadedMetadata}
            onError={() => setHasError(true)}
          />
        )}

        {isLoaded && !hasError && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
            <Play className="w-3 h-3 fill-current" />
            {duration && <span>{duration}</span>}
          </div>
        )}
      </div>

      <div className="absolute top-2 right-2 opacity-0 group-hover/video:opacity-100 transition-opacity">
        <Button
          variant="secondary"
          size="sm"
          className="h-8 w-8 p-0 bg-black/20 hover:bg-black/40 border-0"
          onClick={(e) => {
            e.stopPropagation();
            downloadFile(attachment.storageUrl || '', attachment.originalFilename || 'video');
          }}
        >
          <Download className="w-4 h-4 text-white" />
        </Button>
      </div>
    </div>
  );
};

const AudioAttachment: FC<{ attachment: Attachment }> = ({ attachment }) => {
  const proxiedUrl = getProxiedUrl(attachment.storageUrl || '');

  return (
    <div className="bg-muted rounded-lg p-3 max-w-sm">
      <div className="flex items-center gap-3 mb-2">
        <Music className="w-5 h-5 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {attachment.originalFilename || 'Audio file'}
          </p>
          {attachment.sizeBytes && (
            <p className="text-xs text-muted-foreground">{formatFileSize(attachment.sizeBytes)}</p>
          )}
        </div>
      </div>
      <audio src={proxiedUrl} className="w-full" controls preload="metadata">
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
  const { data: previewURL } = useSignedUrl(attachment.storageUrl?.split('files/')[1] || '');

  const getFileColor = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'border-red-200 bg-red-50 dark:bg-red-950/20';
      case 'doc':
      case 'docx':
        return 'border-blue-200 bg-blue-50 dark:bg-blue-950/20';
      case 'xls':
      case 'xlsx':
        return 'border-green-200 bg-green-50 dark:bg-green-950/20';
      case 'ppt':
      case 'pptx':
        return 'border-orange-200 bg-orange-50 dark:bg-orange-950/20';
      default:
        return 'border-border bg-muted';
    }
  };

  const isViewableDocument = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    return ['pdf', 'doc', 'docx', 'xls', 'xlsx'].includes(extension || '');
  };

  const getPreviewUrl = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();

    if (previewURL && ext === 'pdf') {
      return `${previewURL}#toolbar=0`;
    }
    if (previewURL && ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext || '')) {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewURL)}`;
    }
    return null;
  };

  const previewUrl = getPreviewUrl(attachment.originalFilename || '');
  const canPreview = isViewableDocument(attachment.originalFilename || '');

  const handleClick = () => {
    if (canPreview) {
      onOpenMediaViewer();
    } else {
      const proxiedUrl = getProxiedUrl(attachment.storageUrl || '');
      window.open(proxiedUrl, '_blank');
    }
  };

  return (
    <div className="relative group/document w-48">
      <div
        className={cn(
          'rounded-lg border-2 cursor-pointer hover:shadow-md transition-all overflow-hidden',
          getFileColor(attachment.originalFilename || ''),
        )}
        onClick={handleClick}
      >
        <div className="p-3 pb-2">
          <div className="flex items-center gap-2 mb-1">
            {getFileIcon(attachment.originalFilename || '')}
            <p className="text-sm font-medium truncate flex-1">
              {attachment.originalFilename || 'Document'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase">
              {attachment.originalFilename?.split('.').pop() || 'FILE'}
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

        <div className="h-24 bg-muted/50 relative overflow-hidden">
          {previewUrl && canPreview && !previewError ? (
            <>
              {!previewLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 opacity-50">
                    {getFileIcon(attachment.originalFilename || '')}
                  </div>
                </div>
              )}
              <iframe
                src={previewUrl}
                className={cn(
                  'w-full h-full border-0 pointer-events-none',
                  !previewLoaded && 'opacity-0',
                )}
                style={
                  attachment.originalFilename?.toLowerCase().includes('.doc')
                    ? {
                        width: '200%',
                        height: '200%',
                        transform: 'scale(0.5)',
                        transformOrigin: 'top left',
                      }
                    : undefined
                }
                onLoad={() => setPreviewLoaded(true)}
                onError={() => setPreviewError(true)}
              />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 opacity-50">
                {getFileIcon(attachment.originalFilename || '')}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="absolute top-2 right-2 opacity-0 group-hover/document:opacity-100 transition-opacity">
        <Button
          variant="secondary"
          size="sm"
          className="h-6 w-6 p-0 bg-background/80 hover:bg-background border-0"
          onClick={(e) => {
            e.stopPropagation();
            downloadFile(attachment.storageUrl || '', attachment.originalFilename || 'document');
          }}
        >
          <Download className="w-3 h-3 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
};

const isDocumentFile = (attachment: Attachment): boolean => {
  const mimeType = attachment.contentType || '';
  const filename = attachment.originalFilename || '';

  const documentMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    'application/vnd.ms-powerpoint', // .ppt
  ];

  if (documentMimeTypes.includes(mimeType)) {
    return true;
  }
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('presentation') ||
    mimeType.includes('officedocument') ||
    mimeType.includes('msword') ||
    mimeType.includes('ms-excel') ||
    mimeType.includes('ms-powerpoint')
  ) {
    return true;
  }

  return /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i.test(filename);
};

const GenericAttachment: FC<{ attachment: Attachment }> = ({ attachment }) => {
  const handleClick = () => {
    const proxiedUrl = getProxiedUrl(attachment.storageUrl || '');
    window.open(proxiedUrl, '_blank');
  };

  return (
    <div
      className="bg-muted rounded-lg p-3 max-w-sm hover:bg-muted/80 transition-colors cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex items-center gap-3">
        <File className="w-5 h-5 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{attachment.originalFilename || 'File'}</p>
          {attachment.sizeBytes && (
            <p className="text-xs text-muted-foreground">{formatFileSize(attachment.sizeBytes)}</p>
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
  isThread?: boolean;
}> = ({ attachments, onOpenMediaViewer, isThread = false }) => {
  const renderAttachment = (attachment: Attachment, index: number, isSingle = false) => {
    const mimeType = attachment.contentType || '';

    if (mimeType.startsWith('image/')) {
      return (
        <ImageAttachment
          key={attachment.id}
          attachment={attachment}
          onOpenMediaViewer={() => onOpenMediaViewer(attachments, index)}
          isSingle={isSingle}
          isThread={isThread}
          priority={true}
        />
      );
    }

    if (mimeType.startsWith('video/')) {
      return (
        <VideoAttachment
          key={attachment.id}
          attachment={attachment}
          onOpenMediaViewer={() => onOpenMediaViewer(attachments, index)}
          isSingle={isSingle}
          isThread={isThread}
        />
      );
    }

    if (mimeType.startsWith('audio/')) {
      return <AudioAttachment key={attachment.id} attachment={attachment} />;
    }

    if (isDocumentFile(attachment)) {
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

  if (attachments.length === 0) {
    return null;
  }

  const isSingleAttachment = attachments.length === 1;

  return (
    <div className="mt-2">
      {isSingleAttachment ? (
        <div className="flex justify-start">{renderAttachment(attachments[0], 0, true)}</div>
      ) : (
        <div className="flex flex-wrap items-start gap-2">
          {attachments.map((attachment, index) => renderAttachment(attachment, index, false))}
        </div>
      )}
    </div>
  );
};

interface ChatMessageProps {
  message: Message;
  currentUser: CurrentUser;
  hideReplies?: boolean;
  isCompact?: boolean;
  showAvatar?: boolean;
  hideThreadButton?: boolean;
  isInThread?: boolean;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  onReaction: (messageId: string, emoji: string) => void;
  isHighlighted?: boolean;
}

export const ChatMessage: FC<ChatMessageProps> = ({
  message,
  currentUser,
  hideReplies = false,
  isCompact = false,
  showAvatar = true,
  hideThreadButton = false,
  isInThread = false,
  onEdit,
  onDelete,
  onReaction,
  isHighlighted,
}) => {
  const { workspaceId } = useParamIds();
  const { data: members } = useGetMembers(workspaceId);
  const messageRef = useRef<HTMLDivElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false);
  const [mediaViewerAttachments, setMediaViewerAttachments] = useState<Attachment[]>([]);
  const [mediaViewerInitialIndex, setMediaViewerInitialIndex] = useState(0);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<QuillDelta | null>(null);
  const {
    openEmojiPickerMessageId,
    openEmojiPickerMessageIdInThread,
    setEmojiPickerOpen,
    setEmojiPickerOpenInThread,
    setThreadOpen,
    setProfilePanelOpen,
  } = useUIStore();

  useEffect(() => {
    if (isHighlighted && messageRef.current) {
      messageRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [isHighlighted]);

  const isOwnMessage = message.authorId === currentUser.id;

  const isEmojiPickerOpen = isInThread
    ? openEmojiPickerMessageIdInThread === message.id
    : openEmojiPickerMessageId === message.id;

  const handleEmojiSelect = (emoji: string) => {
    onReaction?.(message.id, emoji);
    setEmojiPickerOpen(null);
  };

  const handleEmojiPickerToggle = (open: boolean) => {
    if (isInThread) {
      setEmojiPickerOpenInThread(open ? message.id : null);
    } else {
      setEmojiPickerOpen(open ? message.id : null);
    }
  };

  const handleOpenMediaViewer = (attachments: Attachment[], initialIndex: number) => {
    setMediaViewerAttachments(attachments);
    setMediaViewerInitialIndex(initialIndex);
    setIsMediaViewerOpen(true);
  };

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleEditClick = () => {
    const deltaContent = parseMessageContent(message.content);
    setEditingContent(deltaContent);
    setIsEditing(true);
    setIsDropdownOpen(false);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditingContent(null);
  };

  const handleEditSave = async (editorValue: {
    image: File | null;
    body: string;
    attachments: Attachment[];
    plainText: string;
  }) => {
    const { body, plainText } = editorValue;
    if (!onEdit || !plainText.trim()) {
      return;
    }

    try {
      await onEdit(message.id, body);
      setIsEditing(false);
      setEditingContent(null);
    } catch (error) {
      console.error('Error updating message:', error);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!onDelete) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(message.id);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting message:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <div
        ref={messageRef}
        className={cn(
          'group/message relative flex gap-3 px-4 py-1.5 transition-colors duration-100 ease-in-out',
          {
            'hover:bg-message-hover': !isEditing,
            'pt-3': !isCompact,
          },
          isHighlighted && 'message-highlighted',
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex gap-3">
          {showAvatar && !isCompact ? (
            <Avatar
              className="w-9 h-9 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => {
                const workspaceMember = members?.find(
                  (member) => member.user.id === message.author.id,
                );
                if (workspaceMember) {
                  setProfilePanelOpen(workspaceMember.id);
                }
              }}
              showPresence={false}
            >
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
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>
          )}

          <div className="flex-1 min-w-0">
            {!isCompact && (
              <div className="flex items-baseline gap-2 mb-0.5">
                <span
                  className="font-semibold text-foreground hover:underline cursor-pointer leading-tight"
                  onClick={() => {
                    const workspaceMember = members?.find(
                      (member) => member.user.id === message.author.id,
                    );
                    if (workspaceMember) {
                      setProfilePanelOpen(workspaceMember.id);
                    }
                  }}
                >
                  {message.author.name}
                </span>
                <span className="text-xs text-muted-foreground leading-tight">
                  {formatDistanceToNow(new Date(message.timestamp), {
                    addSuffix: true,
                  })}
                </span>
                {message.isEdited && (
                  <span className="text-xs text-text-subtle leading-tight">(edited)</span>
                )}
              </div>
            )}

            <div className={cn('leading-relaxed', !isCompact && 'mt-0')}>
              {isEditing ? (
                <div className="mt-2">
                  <Editor
                    variant="update"
                    defaultValue={editingContent as Delta | Op[] | undefined}
                    workspaceId={workspaceId}
                    onSubmit={handleEditSave}
                    onCancel={handleEditCancel}
                    placeholder="Edit your message..."
                    disabled={false}
                    userId={currentUser.id}
                  />
                </div>
              ) : (
                <>
                  <MessageContent content={message.content} />

                  {/* Show inline thinking status for agent messages */}
                  {message.sender_type === 'agent' &&
                    (message._isStreaming || message._thinking) && (
                      <InlineThinkingStatus
                        isStreaming={!!message._isStreaming}
                        thinking={message._thinking}
                      />
                    )}
                </>
              )}
            </div>

            {message.attachments && message.attachments.length > 0 && (
              <AttachmentGrid
                attachments={message.attachments}
                onOpenMediaViewer={handleOpenMediaViewer}
                isThread={isInThread}
              />
            )}

            {message?.reactions && message.reactions?.length > 0 ? (
              <MessageReactions
                reactions={message.reactions}
                onReaction={(emoji) => onReaction?.(message.id, emoji)}
                currentUserId={currentUser.id}
              />
            ) : null}

            {!hideThreadButton && (message.threadCount || message.hasDraft) ? (
              <ThreadButton message={message} members={members} hasDraft={message.hasDraft} />
            ) : null}
          </div>
        </div>

        {!isEditing && (
          <div
            className={cn(
              'absolute top-0 right-4 bg-card border border-border-subtle rounded-lg shadow-sm transition-opacity',
              isEmojiPickerOpen || isDropdownOpen || isHovered
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100',
            )}
          >
            <div className="flex items-center">
              <EmojiPicker
                open={isEmojiPickerOpen}
                onOpenChange={handleEmojiPickerToggle}
                onSelect={handleEmojiSelect}
                trigger={
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-sidebar-hover">
                    <Smile className="w-4 h-4" />
                  </Button>
                }
              />

              {!hideThreadButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-sidebar-hover"
                  onClick={() => setThreadOpen(message)}
                >
                  <MessageSquare className="w-4 h-4" />
                </Button>
              )}

              {isOwnMessage && (
                <DropdownMenu onOpenChange={setIsDropdownOpen}>
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
                    <DropdownMenuItem onClick={handleEditClick}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit message
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleDeleteClick}
                      className="text-text-destructive hover:text-text-destructive/80"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete message
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        )}
      </div>

      <MediaViewerModal
        isOpen={isMediaViewerOpen}
        onClose={() => setIsMediaViewerOpen(false)}
        attachments={mediaViewerAttachments}
        initialIndex={mediaViewerInitialIndex}
      />

      <DeleteMessageModal
        isOpen={isDeleteDialogOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </>
  );
};
