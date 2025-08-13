export const webhooksQueryKeys = {
  all: ['webhooks'] as const,
  lists: () => [...webhooksQueryKeys.all, 'list'] as const,
  list: (workspaceId: string) => [...webhooksQueryKeys.lists(), workspaceId] as const,
  details: () => [...webhooksQueryKeys.all, 'detail'] as const,
  detail: (webhookId: string) => [...webhooksQueryKeys.details(), webhookId] as const,
} as const;
