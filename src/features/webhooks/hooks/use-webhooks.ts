import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  type CreateWebhookData,
  type CreateWebhookResponse,
  type Webhook,
  webhooksApi,
} from '../api/webhooks-api';

/**
 * Query keys for webhooks
 */
export const webhooksQueryKeys = {
  all: ['webhooks'] as const,
  lists: () => [...webhooksQueryKeys.all, 'list'] as const,
  list: (workspaceId: string) => [...webhooksQueryKeys.lists(), workspaceId] as const,
  details: () => [...webhooksQueryKeys.all, 'detail'] as const,
  detail: (webhookId: string) => [...webhooksQueryKeys.details(), webhookId] as const,
};

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
export const useWebhookDetails = (webhookId: string) => {
  return useQuery({
    queryKey: webhooksQueryKeys.detail(webhookId),
    queryFn: () => webhooksApi.getWebhookDetails(webhookId),
    enabled: !!webhookId,
  });
};

/**
 * Hook to create a new webhook
 */
export const useCreateWebhook = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation<CreateWebhookResponse, Error, CreateWebhookData>({
    mutationFn: webhooksApi.createWebhook,

    onSuccess: (data, variables) => {
      // Invalidate and refetch webhooks list
      queryClient.invalidateQueries({
        queryKey: webhooksQueryKeys.list(variables.workspace_id),
      });

      // Add the new webhook to the cache with complete details
      const newWebhook: Webhook = {
        id: data.id,
        name: variables.name,
        is_active: true,
        last_used_at: null,
        created_at: new Date().toISOString(),
        created_by_name: 'You', // Will be updated on refetch
        total_requests: 0,
        url: data.url,
        secret_token: data.secret_token,
        signing_secret: data.signing_secret,
      };

      // Return the complete webhook data for immediate use
      return { ...data, ...newWebhook };
    },

    onError: (error) => {
      console.error('Failed to create webhook:', error);
      toast.error('Failed to create webhook. Please try again.');
    },
  });
};

/**
 * Hook to delete a webhook
 */
export const useDeleteWebhook = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: webhooksApi.deleteWebhook,

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

  return useMutation<
    Webhook,
    Error,
    { webhookId: string; data: { is_active?: boolean; name?: string } }
  >({
    mutationFn: ({ webhookId, data }) => webhooksApi.updateWebhook(webhookId, data),

    onSuccess: (updatedWebhook, { webhookId }) => {
      // Update webhook in the list cache
      queryClient.setQueryData<Webhook[]>(
        webhooksQueryKeys.list(workspaceId),
        (oldData) =>
          oldData?.map((webhook) =>
            webhook.id === webhookId ? { ...webhook, ...updatedWebhook } : webhook,
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
      toast.error('Failed to update webhook. Please try again.');
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
      webhooksApi.updateWebhook(webhookId, { is_active: !currentStatus }),

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
