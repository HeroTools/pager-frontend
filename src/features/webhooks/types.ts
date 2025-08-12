export interface Webhook {
  id: string;
  name: string;
  source_type: 'custom' | 'github' | 'linear' | 'jira';
  channel_id?: string;
  channel_name?: string;
  is_active: boolean;
  last_used_at: string | null;
  last_message_at: string | null;
  message_count: number;
  created_at: string;
  created_by_name: string;
  total_requests: number;

  // These fields are only available when fetching details
  url?: string;
  secret_token?: string;
  signing_secret?: string;
}
