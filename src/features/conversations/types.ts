// features/conversations/types.ts
import {
  Conversation,
  ConversationWithMembers,
  Message,
  MessageWithRelations,
  UpdateEntityInput,
  ApiResponse,
  SendMessageRequest,
} from "@/types/database";
import { MessageWithUser } from "../messages/types";

// Use the database Conversation type directly
export type ConversationEntity = Conversation;

// Extended conversation type with members and messages
export type ConversationWithMembersList = ConversationWithMembers;

// Message types for conversations (messages where conversation_id is not null)
export type ConversationMessage = Message & { conversation_id: string };
export type ConversationMessageWithRelations = MessageWithRelations & {
  conversation_id: string;
};

// Create conversation data - participants will be added via conversation_members table
export interface CreateConversationData {
  participantMemberIds: string[]; // User IDs to add as participants
}

export interface CreateConversationResponse extends ConversationEntity {
  member_count: number;
}

// Message creation for conversations - based on SendMessageRequest but conversation-specific
export interface CreateConversationMessageData
  extends Omit<SendMessageRequest, "channel_id"> {
  conversation_id: string;
}

// Update message data
export type UpdateConversationMessageData = UpdateEntityInput<Message>;

// Add/remove participants
export interface AddConversationParticipantData {
  workspace_member_id: string;
}

// API Response types using the generic ApiResponse
export type ConversationResponse = ApiResponse<ConversationEntity>;
export type ConversationsResponse = ApiResponse<ConversationEntity[]>;
export type ConversationWithMembersResponse =
  ApiResponse<ConversationWithMembersList>;
export type ConversationMessageResponse = ApiResponse<ConversationMessage>;
export type ConversationMessagesResponse = ApiResponse<ConversationMessage[]>;
export type ConversationMessageWithRelationsResponse =
  ApiResponse<ConversationMessageWithRelations>;

// === NEW TYPES FOR COMBINED API ENDPOINT ===

// Request parameters for the new combined endpoint
export interface GetConversationMessagesParams {
  limit?: number;
  cursor?: string;
  before?: string;
}

// User status information
export interface ConversationUserStatus {
  status: string;
  custom_status: string | null;
  status_emoji: string | null;
  last_seen_at: string | null;
}

// Conversation member with user data from combined endpoint
export interface ConversationMemberWithUser {
  id: string;
  conversation_id: string;
  workspace_member_id: string;
  joined_at: string;
  left_at: string | null;
  last_read_message_id: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  status?: ConversationUserStatus;
}

// Combined conversation data structure
export interface ConversationWithMessagesAndMembers {
  conversation: ConversationEntity;
  messages: MessageWithUser[];
  members: ConversationMemberWithUser[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
    totalCount: number;
  };
}

// API response for the combined endpoint
export type ConversationWithMessagesResponse =
  ApiResponse<ConversationWithMessagesAndMembers>;

// === END NEW TYPES ===

// Extended conversation with last message for UI lists
export interface ConversationListItem extends ConversationEntity {
  last_message?: ConversationMessage;
  unread_count?: number;
  participants?: Array<{
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
    };
    joined_at: string;
    left_at?: string;
  }>;
}

// Conversation filtering and search
export interface ConversationFilters {
  workspace_id: string;
  participant_user_id?: string; // Filter conversations where user is a participant
  has_unread?: boolean;
  search_query?: string;
}

// Message filtering for conversations
export interface ConversationMessageFilters {
  conversation_id: string;
  before?: string; // Message ID for pagination
  after?: string; // Message ID for pagination
  limit?: number;
  search_query?: string;
}

// Typing indicator for conversations
export interface ConversationTypingEvent {
  conversation_id: string;
  user_id: string;
  user_name: string;
  is_typing: boolean;
}

// Read status for conversation messages
export interface ConversationReadStatus {
  conversation_id: string;
  last_read_message_id?: string;
  user_id: string;
}

// UI-specific types
export interface ConversationFormData {
  participant_emails: string[];
}

export interface DirectMessageFormData {
  recipient_user_id: string;
}
