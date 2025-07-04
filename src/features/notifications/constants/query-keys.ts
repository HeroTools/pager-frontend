import { NotificationFilters } from '../types';

export const notificationKeys = {
  all: ['notifications'] as const,
  workspace: (workspaceId: string) => [...notificationKeys.all, 'workspace', workspaceId] as const,
  list: (workspaceId: string, filters: Partial<NotificationFilters>) =>
    [...notificationKeys.workspace(workspaceId), 'list', filters] as const,
  initial: (workspaceId: string) =>
    [...notificationKeys.workspace(workspaceId), 'initial'] as const,
  unread: (workspaceId: string) => [...notificationKeys.workspace(workspaceId), 'unread'] as const,
  unreadCount: (workspaceId: string) =>
    [...notificationKeys.workspace(workspaceId), 'unreadCount'] as const,
};
