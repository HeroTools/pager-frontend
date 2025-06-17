import {
  Message,
  MessageWithRelations,
  UpdateEntityInput,
  ApiResponse,
  SendMessageRequest,
  MessageType,
} from "@/types/database";

// Use the database Message type directly
export type MessageEntity = Message;

// Extended message type with relations (user, reactions, etc.)
export type MessageWithAllRelations = MessageWithRelations;

// Channel-specific message (messages where channel_id is not null)
export type ChannelMessage = Message & { channel_id: string };
export type ChannelMessageWithRelations = MessageWithRelations & {
  channel_id: string;
};

// Create message data for channels - based on SendMessageRequest but channel-specific
export interface CreateChannelMessageData
  extends Omit<SendMessageRequest, "conversation_id"> {
  channel_id: string;
}

// Update message data
export type UpdateMessageData = UpdateEntityInput<Message>;

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
  parent_message: MessageWithAllRelations;
  replies: MessageWithAllRelations[];
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
