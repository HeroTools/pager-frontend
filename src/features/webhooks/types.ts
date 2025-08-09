export interface Webhook {
  id: string;
  name: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  created_by_name: string;
  total_requests: number;
  url?: string;
  secret_token?: string;
  signing_secret?: string;
}
