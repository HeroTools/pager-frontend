import { Reaction } from '@/features/reactions/types';

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
  threadLastReplyAt?: string;
  isEdited?: boolean;
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
  description?: string;
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
  publicUrl: string;
  originalFilename?: string;
}
