import {
  Message,
  MessageWithRelations,
  UpdateEntityInput,
  ApiResponse,
  SendMessageRequest,
  MessageType,
  Reaction,
  Attachment,
} from "@/types/database";
import { UploadedAttachment } from "../file-upload/types";

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
  message_type?: "direct" | "thread" | "system";
}

export interface CreateConversationMessageData {
  body: string;
  attachment_ids?: string[];
  parent_message_id?: string;
  thread_id?: string;
  message_type?: "direct" | "thread" | "system";
}

export interface CreateMessageData {
  body: string;
  attachments?: UploadedAttachment[];
  parent_message_id?: string;
  thread_id?: string;
  message_type?: "direct" | "thread" | "system";
}

export interface UpdateMessageData {
  body?: string;
}

export interface MessageWithUser {
  id: string;
  body: string;
  attachment_id: string | null;
  workspace_member_id: string;
  workspace_id: string;
  channel_id: string;
  conversation_id: string | null;
  parent_message_id: string | null;
  thread_id: string | null;
  message_type: string;
  created_at: string;
  updated_at: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  attachments: Attachment[];
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  attachment?: {
    id: string;
    url: string;
    content_type: string | null;
    size_bytes: number | null;
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
}

export type MessageWithUserResponse = ApiResponse<MessageWithUser>;
