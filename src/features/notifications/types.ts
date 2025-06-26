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
