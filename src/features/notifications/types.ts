export interface NotificationData {
  id: string;
  type: "mention" | "direct_message" | "channel_message" | "thread_reply";
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  workspace_id: string;
  related_message_id?: string;
  related_channel_id?: string;
  related_conversation_id?: string;
}

export interface NotificationEntity {
  id: string;
  workspace_member_id: string;
  sender_workspace_member_id: string;
  workspace_id: string;
  type: "mention" | "direct_message" | "channel_message" | "thread_reply";
  title: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  related_message_id?: string;
  related_channel_id?: string;
  related_conversation_id?: string;
  channel_name?: string;
}

export interface NotificationsPagination {
  limit: number;
  cursor: string | null;
  nextCursor: string | null;
  hasMore: boolean;
}

export interface NotificationsResponse {
  notifications: NotificationEntity[];
  pagination: NotificationsPagination;
  unread_count: number;
}

export interface NotificationFilters {
  limit?: number;
  cursor?: string;
  unreadOnly?: boolean;
}

export interface MarkNotificationReadResponse {
  id: string;
  is_read: boolean;
  read_at: string;
  message: string;
}

export interface MarkAllNotificationsReadResponse {
  updated_count: number;
  updated_notification_ids: string[];
  message: string;
}
