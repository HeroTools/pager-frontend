import api from '@/lib/api/axios-client';
import { Webhook } from '../types';

export interface CreateWebhookData {
  workspace_id: string;
  name: string;
}

export interface CreateWebhookResponse {
  id: string;
  url: string;
  secret_token: string;
  signing_secret: string;
}

export interface ListWebhooksResponse {
  webhooks: Webhook[];
}

export const webhooksApi = {
  /**
   * Create a new webhook
   */
  createWebhook: async (data: CreateWebhookData): Promise<CreateWebhookResponse> => {
    const { data: response } = await api.post<CreateWebhookResponse>('/webhooks', data);
    return response;
  },

  /**
   * List all webhooks for a workspace
   */
  listWebhooks: async (workspaceId: string): Promise<Webhook[]> => {
    const { data: response } = await api.get<ListWebhooksResponse>('/webhooks', {
      params: { workspace_id: workspaceId },
    });
    return response.webhooks;
  },

  /**
   * Delete a webhook
   */
  deleteWebhook: async (webhookId: string): Promise<void> => {
    await api.delete(`/webhooks/${webhookId}`);
  },

  /**
   * Update webhook status (activate/deactivate)
   */
  updateWebhook: async (
    webhookId: string,
    data: { is_active?: boolean; name?: string },
  ): Promise<Webhook> => {
    const { data: response } = await api.patch<Webhook>(`/webhooks/${webhookId}`, data);
    return response;
  },

  /**
   * Get webhook details with secrets
   */
  getWebhookDetails: async (webhookId: string): Promise<CreateWebhookResponse> => {
    const { data: response } = await api.get<CreateWebhookResponse>(
      `/webhooks/${webhookId}/details`,
    );
    return response;
  },
};
