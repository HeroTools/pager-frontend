import type {
  ApiResponse,
  Attachment,
  Message,
  MessageType,
  MessageWithRelations,
} from '@/types/database';
import type { InfiniteData } from '@tanstack/react-query';
import type { UploadedAttachment } from '../file-upload/types';

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
export type GetMessageByIdResponse = {
  message: MessageWithUser;
};

// Message thread types
export interface MessageThread {
  replies: MessageWithUser[];
  reply_count: number;
  last_reply_at?: string;
}

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

export interface QuillDelta {
  ops: QuillOp[];
}

export interface QuillOp {
  insert?: string | Record<string, unknown>;
  retain?: number;
  delete?: number;
  attributes?: Record<string, unknown>;
}

export interface UpdateMessageData {
  body?: string;
  attachment_ids?: string[];
  parent_message_id?: string | null;
  thread_id?: string | null;
  message_type?: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  workspace_member_id: string;
}

export interface MessagePage {
  messages: MessageWithUser[];
  members: unknown[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
    totalCount: number;
  };
}

export interface ThreadData {
  replies: MessageWithUser[];
  members: unknown[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
    totalCount: number;
  };
}

export type MessagesInfiniteData = InfiniteData<MessagePage, string | undefined>;

export interface MessageMutationContext {
  previousChannelMessages?: MessagesInfiniteData;
  previousConversationMessages?: MessagesInfiniteData;
  previousThreadMessages?: ThreadData;
  isThreadMessage: boolean;
  threadParentId?: string;
  optimisticId?: string;
}

export interface UpdateMessageContext {
  channels?: readonly [readonly unknown[], unknown][];
  conversations?: readonly [readonly unknown[], unknown][];
  threads?: readonly [readonly unknown[], unknown][];
}

export interface MessageRepliesParams {
  limit?: number;
  cursor?: string;
  before?: string;
  entity_type?: 'channel' | 'conversation';
  entity_id?: string;
}

export interface TypingIndicatorData {
  is_typing: boolean;
}
