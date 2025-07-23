import type {
  ApiResponse,
  Conversation,
  ConversationWithMembers,
  Message,
  MessageWithRelations,
  SendMessageRequest,
} from '@/types/database';
import type { ChatMember, MemberWithUser } from '../members';
import type { MessageWithUser } from '../messages/types';

export interface ConversationEntity extends Conversation {
  members: ChatMember[];
  member_count: number;
  other_members: ChatMember[];
  is_group_conversation: boolean;
}

export interface ConversationMemberResponse {
  conversation_member_id: string;
  workspace_member_id: string;
  joined_at: string;
  left_at: string | null;
  last_read_message_id: string | null;
  is_hidden: boolean;
  conversation_id: string;
}

export type WorkspaceMemberWithoutId = Omit<MemberWithUser, 'id'>;
export type ConversationMember = WorkspaceMemberWithoutId & ConversationMemberResponse;

// Extended conversation type with members and messages
export type ConversationWithMembersList = ConversationWithMembers;

// Message types for conversations (messages where conversation_id is not null)
export type ConversationMessage = Message & { conversation_id: string };
export type ConversationMessageWithRelations = MessageWithRelations & {
  conversation_id: string;
};

export interface CreateConversationData {
  participantMemberIds: string[]; // User IDs to add as participants
}

export interface CreateConversationResponse extends ConversationEntity {
  member_count: number;
}

export interface CreateConversationMessageData extends Omit<SendMessageRequest, 'channel_id'> {
  conversation_id: string;
}

// Add/remove participants
export interface AddConversationParticipantData {
  workspace_member_id: string;
}

// API Response types using the generic ApiResponse
export type ConversationResponse = ApiResponse<ConversationEntity>;
export type ConversationWithMembersResponse = ApiResponse<ConversationWithMembersList>;
export type ConversationMessageResponse = ApiResponse<ConversationMessage>;
export type ConversationMessagesResponse = ApiResponse<ConversationMessage[]>;
export type ConversationMessageWithRelationsResponse =
  ApiResponse<ConversationMessageWithRelations>;

// Request parameters for the new combined endpoint
export interface GetConversationMessagesParams {
  limit?: number;
  cursor?: string;
  before?: string;
}

export interface GetConversations {
  id: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
  members: ConversationMemberWithDetails[];
  member_count: number;
  other_members: ConversationMemberWithDetails[];
  is_group_conversation: boolean;
}

export interface ConversationMemberWithDetails {
  id: string;
  joined_at: string;
  left_at: string | null;
  is_hidden: boolean;
  workspace_member: {
    id: string;
    role: string;
    user: User;
  };
}

export interface User {
  id: string;
  name: string;
  image: string | null;
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
  members: ChatMember[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
    totalCount: number;
  };
}

// API response for the combined endpoint
export type ConversationWithMessagesResponse = ApiResponse<ConversationWithMessagesAndMembers>;

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
