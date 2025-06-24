// Enums
export type MessageType = "text" | "file" | "system" | "bot" | "thread_reply";
export type ChannelMemberRole = "admin" | "member";
export type WorkspaceMemberRole = "admin" | "member";
export type InviteType = "workspace" | "channel";
export type InviteStatus = "pending" | "accepted" | "expired" | "revoked";
export type NotificationType =
  | "mention"
  | "direct_message"
  | "channel_message"
  | "thread_reply"
  | "system";
export type ChannelType = "public" | "private";
export type UserStatus = "online" | "away" | "busy" | "offline";
export type CallType = "audio" | "video";
export type CallStatus =
  | "initiated"
  | "ringing"
  | "active"
  | "ended"
  | "missed"
  | "declined";
export type CallParticipantStatus = "invited" | "joined" | "left" | "declined";

// Base interface for common fields
interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

// Core Entities
export interface User extends BaseEntity {
  email: string;
  name: string;
  image?: string;
}

export interface Workspace extends BaseEntity {
  name: string;
  user_id: string;
}

export interface WorkspaceMember extends BaseEntity {
  user_id: string;
  workspace_id: string;
  role: WorkspaceMemberRole;
}

export interface Channel extends BaseEntity {
  name: string;
  workspace_id: string;
  channel_type: ChannelType;
}

export interface ChannelMember extends BaseEntity {
  channel_id: string;
  workspace_member_id: string;
  joined_at: string;
  role: ChannelMemberRole;
  notifications_enabled: boolean;
  last_read_message_id?: string;
}

export interface Conversation extends BaseEntity {
  workspace_id: string;
}

export interface ConversationMember extends BaseEntity {
  conversation_id: string;
  workspace_member_id: string;
  joined_at: string;
  left_at?: string;
  last_read_message_id?: string;
}

export interface Attachment extends BaseEntity {
  s3_bucket: string;
  s3_key: string;
  content_type?: string;
  size_bytes?: number;
  uploaded_by: string;
  url?: string;
}

export interface Message extends Omit<BaseEntity, "updated_at"> {
  body: string;
  attachment_id?: string;
  workspace_member_id: string;
  workspace_id: string;
  channel_id?: string;
  conversation_id?: string;
  parent_message_id?: string;
  thread_id?: string;
  message_type: MessageType;
  edited_at?: string;
  deleted_at?: string;
  updated_at?: string;
}

export interface Reaction extends Omit<BaseEntity, "updated_at"> {
  workspace_id: string;
  message_id: string;
  member_id: string;
  value: string;
}

export interface Notification extends Omit<BaseEntity, "updated_at"> {
  user_id: string;
  workspace_id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_message_id?: string;
  related_channel_id?: string;
  related_conversation_id?: string;
  is_read: boolean;
  read_at?: string;
}

export interface Invite extends BaseEntity {
  workspace_id: string;
  invited_by_user_id: string;
  email: string;
  invite_token: string;
  invite_type: InviteType;
  channel_id?: string;
  status: InviteStatus;
  expires_at: string;
  accepted_at?: string;
  accepted_by_user_id?: string;
}

export interface UserStatusI extends BaseEntity {
  user_id: string;
  workspace_id: string;
  status: UserStatus;
  custom_status?: string;
  status_emoji?: string;
  last_seen_at?: string;
}

export interface CustomEmoji extends BaseEntity {
  workspace_id: string;
  name: string;
  image_url: string;
  created_by_user_id: string;
}

export interface AuditLog extends Omit<BaseEntity, "updated_at"> {
  workspace_id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

export interface Call extends BaseEntity {
  workspace_id: string;
  channel_id?: string;
  conversation_id?: string;
  initiated_by_user_id: string;
  call_type: CallType;
  status: CallStatus;
  started_at?: string;
  ended_at?: string;
  duration_seconds?: number;
}

export interface CallParticipant extends BaseEntity {
  call_id: string;
  user_id: string;
  joined_at?: string;
  left_at?: string;
  status: CallParticipantStatus;
}

// Extended interfaces with relations (useful for API responses)
export interface UserWithWorkspaces extends User {
  workspaces?: WorkspaceMember[];
}

export interface WorkspaceWithMembers extends Workspace {
  members?: (WorkspaceMember & { user: User })[];
  channels?: Channel[];
  owner?: User;
}

export interface ChannelWithMembers extends Channel {
  members?: (ChannelMember & {
    workspace_member: WorkspaceMember & { user: User };
  })[];
  workspace?: Workspace;
  _count?: {
    members: number;
    messages: number;
  };
}

export interface MessageWithRelations extends Message {
  workspace_member?: WorkspaceMember & { user: User };
  attachments?: Attachment[];
  channel?: Channel;
  conversation?: Conversation;
  parent_message?: Message;
  thread_messages?: Message[];
  reactions?: (Reaction & { member: WorkspaceMember & { user: User } })[];
  _count?: {
    reactions: number;
    thread_messages: number;
  };
}

export interface ConversationWithMembers extends Conversation {
  members?: (ConversationMember & {
    workspace_member: WorkspaceMember & { user: User };
  })[];
  messages?: MessageWithRelations[];
  workspace?: Workspace;
  _count?: {
    members: number;
    messages: number;
  };
}

export interface NotificationWithRelations extends Notification {
  user?: User;
  workspace?: Workspace;
  related_message?: Message;
  related_channel?: Channel;
  related_conversation?: Conversation;
}

export interface CallWithParticipants extends Call {
  participants?: (CallParticipant & { user: User })[];
  channel?: Channel;
  conversation?: Conversation;
  initiated_by?: User;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Request/Form types
export interface CreateWorkspaceRequest {
  name: string;
}

export interface CreateChannelRequest {
  name: string;
  workspace_id: string;
  channel_type?: ChannelType;
}

export interface SendMessageRequest {
  body: string;
  workspace_id: string;
  channel_id?: string;
  conversation_id?: string;
  parent_message_id?: string;
  attachment_id?: string;
  message_type?: MessageType;
}

export interface UpdateMessageRequest {
  body?: string;
}

export interface CreateInviteRequest {
  email: string;
  workspace_id: string;
  invite_type: InviteType;
  channel_id?: string;
}

export interface UpdateUserStatusRequest {
  status: UserStatus;
  custom_status?: string;
  status_emoji?: string;
}

export interface CreateReactionRequest {
  message_id: string;
  value: string;
}

export interface InitiateCallRequest {
  workspace_id: string;
  channel_id?: string;
  conversation_id?: string;
  call_type: CallType;
  participant_ids: string[];
}

// Search and filter types
export interface MessageSearchFilters {
  workspace_id: string;
  channel_id?: string;
  conversation_id?: string;
  user_id?: string;
  before?: string;
  after?: string;
  has_attachments?: boolean;
  message_type?: MessageType;
  search_query?: string;
}

export interface UserSearchFilters {
  workspace_id?: string;
  status?: UserStatus;
  search_query?: string;
}

// Utility types
export type CreateEntityInput<T extends BaseEntity> = Omit<
  T,
  "id" | "created_at" | "updated_at"
>;
export type UpdateEntityInput<T extends BaseEntity> = Partial<
  Omit<T, "id" | "created_at" | "updated_at">
>;

// Database query options
export interface QueryOptions {
  include?: Record<string, boolean | QueryOptions>;
  select?: Record<string, boolean>;
  orderBy?: Record<string, "asc" | "desc">;
  take?: number;
  skip?: number;
  where?: Record<string, any>;
}

// Real-time event types (for WebSocket/Server-Sent Events)
export interface RealtimeEvent<T = any> {
  type: string;
  workspace_id: string;
  channel_id?: string;
  conversation_id?: string;
  user_id?: string;
  data: T;
  timestamp: string;
}

export interface MessageEvent extends RealtimeEvent<MessageWithRelations> {
  type: "message.created" | "message.updated" | "message.deleted";
}

export interface ReactionEvent extends RealtimeEvent<Reaction> {
  type: "reaction.added" | "reaction.removed";
}

export interface UserStatusEvent extends RealtimeEvent<UserStatus> {
  type: "user.status_changed";
}

export interface TypingEvent
  extends RealtimeEvent<{ user_id: string; user_name: string }> {
  type: "user.typing" | "user.stop_typing";
}

export interface CallEvent extends RealtimeEvent<CallWithParticipants> {
  type:
    | "call.initiated"
    | "call.started"
    | "call.ended"
    | "call.participant_joined"
    | "call.participant_left";
}

// Export all event types as union
export type RealtimeEventType =
  | MessageEvent
  | ReactionEvent
  | UserStatusEvent
  | TypingEvent
  | CallEvent;
