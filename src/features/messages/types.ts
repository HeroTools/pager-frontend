import {
  Message,
  MessageWithRelations,
  ApiResponse,
  MessageType,
  Attachment,
} from '@/types/database';
import { UploadedAttachment } from '../file-upload/types';

// Use the database Message type directly
export type MessageEntity = Message;

// Extended message type with relations (user, reactions, etc.)
export type MessageWithAllRelations = MessageWithRelations;

// Channel-specific message (messages where channel_id is not null)
export type ChannelMessage = Message & { channel_id: string };
export type ChannelMessageWithRelations = MessageWithRelations & {
  channel_id: string;
};

// Message filtering and pagination
export interface MessageFilters {
  channel_id?: string;
  conversation_id?: string;
  workspace_id: string;
  before?: string; // Message ID for pagination
  after?: string; // Message ID for pagination
  limit?: number;
  search_query?: string;
  message_type?: MessageType;
  has_attachments?: boolean;
  user_id?: string; // Filter by specific user
}

// API Response types using the generic ApiResponse
export type MessageResponse = ApiResponse<MessageEntity>;
export type MessagesResponse = ApiResponse<{
  messages: MessageEntity[];
  has_more: boolean;
  next_cursor?: string;
}>;
export type MessageWithRelationsResponse = ApiResponse<MessageWithAllRelations>;
export type MessagesWithRelationsResponse = ApiResponse<{
  messages: MessageWithAllRelations[];
  has_more: boolean;
  next_cursor?: string;
}>;

// Message thread types
export interface MessageThread {
  replies: MessageWithUser[];
  reply_count: number;
  last_reply_at?: string;
}

export type MessageThreadResponse = ApiResponse<MessageThread>;

// Message reaction types
export interface AddReactionData {
  value: string; // emoji or reaction identifier
}

// Message search results
export interface MessageSearchResult {
  message: MessageWithAllRelations;
  channel?: { id: string; name: string };
  conversation?: { id: string };
  match_context?: string;
}

export type MessageSearchResponse = ApiResponse<{
  results: MessageSearchResult[];
  total_count: number;
  has_more: boolean;
}>;

export interface CreateChannelMessageData {
  body: string;
  attachment_ids?: string[];
  parent_message_id?: string;
  thread_id?: string;
  message_type?: 'direct' | 'thread' | 'system';
  plain_text?: string;
}

export interface CreateConversationMessageData {
  body: string;
  attachment_ids?: string[];
  parent_message_id?: string;
  thread_id?: string;
  message_type?: 'direct' | 'thread' | 'system';
  plain_text?: string;
}

export interface CreateMessageData {
  _optimisticId?: string;
  body: string;
  attachments?: UploadedAttachment[];
  parent_message_id?: string;
  thread_id?: string;
  message_type?: 'direct' | 'thread' | 'system';
  plain_text?: string;
}

export interface UpdateMessageData {
  body?: string;
}

export interface MessageWithUser {
  id: string;
  body: string;
  workspace_member_id: string;
  workspace_id: string;
  channel_id: string | null;
  conversation_id: string | null;
  parent_message_id: string | null;
  thread_id: string | null;
  message_type: string;
  created_at: string;
  updated_at: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  thread_reply_count: number;
  thread_last_reply_at: string | null;
  thread_participants: string[];
  attachments: Attachment[];
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  reactions?: Array<{
    id: string;
    value: string;
    count: number;
    users: Array<{
      id: string;
      name: string;
    }>;
  }>;
  _isOptimistic?: boolean;
}

export type MessageWithUserResponse = ApiResponse<MessageWithUser>;

export interface QuillDelta {
  ops: QuillOp[];
}

export interface QuillOp {
  insert?: string | Record<string, unknown>;
  retain?: number;
  delete?: number;
  attributes?: Record<string, unknown>;
}
