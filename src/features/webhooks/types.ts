export interface Webhook {
  id: string;
  name: string;
  source_type: 'custom' | 'github' | 'linear' | 'jira' | 'stripe';
  channel_id?: string;
  channel_name?: string;
  is_active: boolean;
  last_used_at: string | null;
  last_message_at: string | null;
  message_count: number;
  created_at: string;
  created_by_name: string;
  total_requests: number;
  url: string;
  signing_secret?: string | null;

  // These fields are only available when fetching details
  secret_token?: string;
}

export type WebhookSourceType = Webhook['source_type'];

export interface CreateWebhookData {
  workspace_id: string;
  name: string;
  source_type?: WebhookSourceType;
  channel_id?: string;
  signing_secret?: string;
}

export interface UpdateWebhookData {
  name?: string;
  channel_id?: string | null;
  is_active?: boolean;
  signing_secret?: string | null;
}

export interface CreateWebhookResponse {
  id: string;
  url: string;
  source_type: WebhookSourceType;
  channel_id?: string;
  secret_token: string;
  signing_secret: string;
}
