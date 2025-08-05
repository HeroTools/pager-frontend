import type { ThinkingEvent } from '@/features/agents/types';
import type { Reaction } from '@/features/reactions/types';

export interface Message {
  id: string;
  content: string;
  authorId: string;
  author: Author;
  timestamp: Date;
  reactions?: Reaction[];
  attachments: Attachment[];
  threadCount?: number;
  threadParticipants?: string[];
  threadId?: string;
  threadLastReplyAt?: string | undefined;
  isEdited?: boolean;
  hasDraft?: boolean;
  sender_type: string;
  _isStreaming?: boolean;
  _thinking?: ThinkingEvent;
}

export interface Author {
  id: string;
  name: string;
  avatar?: string;
  status: 'online' | 'away' | 'offline';
}

export interface Channel {
  id: string;
  name: string;
  description?: string | undefined;
  isPrivate: boolean;
  type: ChannelType;
  memberCount?: number;
  isDefault?: boolean;
}

export enum ChannelType {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

export interface Attachment {
  contentType: string;
  id: string;
  sizeBytes: number;
  storageUrl: string;
  originalFilename?: string;
}

export interface BaseAttachmentProps {
  attachment: Attachment;
  onOpenMediaViewer?: () => void;
  isSingle?: boolean;
  isThread?: boolean;
  priority?: boolean;
}
