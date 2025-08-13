import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { webhooksApi } from '../api/webhooks-api';
import { webhooksQueryKeys } from '../query-keys';
import type {
  CreateWebhookData,
  CreateWebhookResponse,
  UpdateWebhookData,
  Webhook,
} from '../types';

/**
 * Hook to get all webhooks for a workspace
 */
export const useWebhooks = (workspaceId: string) => {
  return useQuery({
    queryKey: webhooksQueryKeys.list(workspaceId),
    queryFn: () => webhooksApi.listWebhooks(workspaceId),
    enabled: !!workspaceId,
  });
};

/**
 * Hook to get webhook details with secrets
 */
export const useWebhookDetails = (workspaceId: string, webhookId: string) => {
  return useQuery({
    queryKey: webhooksQueryKeys.detail(webhookId),
    queryFn: () => webhooksApi.getWebhookDetails(workspaceId, webhookId),
    enabled: !!webhookId,
  });
};

/**
 * Hook to create a new webhook
 */
export const useCreateWebhook = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation<Webhook, Error, CreateWebhookData>({
    mutationFn: async (variables) => {
      const response = await webhooksApi.createWebhook(variables);
      
      // Transform API response to complete Webhook object
      const newWebhook: Webhook = {
        id: response.id,
        name: variables.name,
        source_type: variables.source_type || 'custom',
        channel_id: response.channel_id,
        channel_name: undefined, // Will be populated on refetch
        is_active: true,
        last_used_at: null,
        last_message_at: null,
        message_count: 0,
        created_at: new Date().toISOString(),
        created_by_name: 'You', // Will be updated on refetch
        total_requests: 0,
        url: response.url,
        secret_token: response.secret_token,
        signing_secret: response.signing_secret,
      };
      
      return newWebhook;
    },

    onSuccess: (newWebhook) => {
      // Add to cache immediately for optimistic update
      queryClient.setQueryData<Webhook[]>(
        webhooksQueryKeys.list(workspaceId),
        (oldData) => [newWebhook, ...(oldData || [])],
      );

      // Also invalidate to ensure fresh data
      queryClient.invalidateQueries({
        queryKey: webhooksQueryKeys.list(workspaceId),
      });
    },

    onError: (error) => {
      console.error('Failed to create webhook:', error);
      // Don't show generic toast here - let the component handle specific error messages
    },
  });
};

/**
 * Hook to delete a webhook
 */
export const useDeleteWebhook = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (webhookId) => webhooksApi.deleteWebhook(workspaceId, webhookId),

    onSuccess: (_, webhookId) => {
      // Remove webhook from cache
      queryClient.setQueryData<Webhook[]>(
        webhooksQueryKeys.list(workspaceId),
        (oldData) => oldData?.filter((webhook) => webhook.id !== webhookId) || [],
      );

      // Remove webhook details from cache
      queryClient.removeQueries({
        queryKey: webhooksQueryKeys.detail(webhookId),
      });
    },

    onError: (error) => {
      console.error('Failed to delete webhook:', error);
      toast.error('Failed to delete webhook. Please try again.');
    },
  });
};

/**
 * Hook to update a webhook
 */
export const useUpdateWebhook = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation<Webhook, Error, { webhookId: string; data: UpdateWebhookData }>({
    mutationFn: ({ webhookId, data }) => webhooksApi.updateWebhook(workspaceId, webhookId, data),

    onSuccess: (updatedWebhook, { webhookId }) => {
      // Update webhook in the list cache with complete data
      queryClient.setQueryData<Webhook[]>(
        webhooksQueryKeys.list(workspaceId),
        (oldData) =>
          oldData?.map((webhook) =>
            webhook.id === webhookId ? updatedWebhook : webhook,
          ) || [],
      );

      // Update webhook details cache if it exists
      queryClient.setQueryData(
        webhooksQueryKeys.detail(webhookId),
        (oldData: CreateWebhookResponse | undefined) =>
          oldData ? { ...oldData, ...updatedWebhook } : undefined,
      );
    },

    onError: (error) => {
      console.error('Failed to update webhook:', error);
      // Don't show generic toast here - let the component handle specific error messages
    },
  });
};

/**
 * Hook to toggle webhook active status
 */
export const useToggleWebhook = (workspaceId: string) => {
  const updateWebhook = useUpdateWebhook(workspaceId);

  return useMutation<Webhook, Error, { webhookId: string; currentStatus: boolean }>({
    mutationFn: ({ webhookId, currentStatus }) =>
      webhooksApi.updateWebhook(workspaceId, webhookId, { is_active: !currentStatus }),

    onSuccess: (updatedWebhook) => {
      const action = updatedWebhook.is_active ? 'activated' : 'deactivated';
      toast.success(`Webhook ${action} successfully`);
    },

    onError: (error) => {
      console.error('Failed to toggle webhook:', error);
      toast.error('Failed to update webhook status. Please try again.');
    },
  });
};
