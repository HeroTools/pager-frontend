import api from '@/lib/api/axios-client';
import { CreateWebhookData, CreateWebhookResponse, UpdateWebhookData, Webhook } from '../types';

export interface ListWebhooksResponse {
  webhooks: Webhook[];
}

export const webhooksApi = {
  /**
   * Create a new webhook
   */
  createWebhook: async (data: CreateWebhookData): Promise<CreateWebhookResponse> => {
    const { data: response } = await api.post<CreateWebhookResponse>(
      `/workspaces/${data.workspace_id}/webhooks`,
      data,
    );
    return response;
  },

  /**
   * List all webhooks for a workspace
   */
  listWebhooks: async (workspaceId: string): Promise<Webhook[]> => {
    const { data: response } = await api.get<ListWebhooksResponse>(
      `/workspaces/${workspaceId}/webhooks`,
    );
    return response.webhooks;
  },

  /**
   * Delete a webhook
   */
  deleteWebhook: async (workspaceId: string, webhookId: string): Promise<void> => {
    await api.delete(`/workspaces/${workspaceId}/webhooks/${webhookId}`);
  },

  /**
   * Update webhook settings
   */
  updateWebhook: async (
    workspaceId: string,
    webhookId: string,
    data: UpdateWebhookData,
  ): Promise<Webhook> => {
    const { data: response } = await api.patch<Webhook>(
      `/workspaces/${workspaceId}/webhooks/${webhookId}`,
      data,
    );
    return response;
  },

  /**
   * Get webhook details with secrets
   */
  getWebhookDetails: async (
    workspaceId: string,
    webhookId: string,
  ): Promise<CreateWebhookResponse> => {
    const { data: response } = await api.get<CreateWebhookResponse>(
      `/workspaces/${workspaceId}/webhooks/${webhookId}/details`,
    );
    return response;
  },
};
