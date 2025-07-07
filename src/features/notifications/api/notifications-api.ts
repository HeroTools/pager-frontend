import api from '@/lib/api/axios-client';
import type {
  MarkAllNotificationsReadResponse,
  MarkNotificationReadResponse,
  NotificationFilters,
  NotificationsResponse,
} from '../types';

export const notificationsApi = {
  getNotifications: async (
    workspaceId: string,
    filters?: Partial<NotificationFilters>,
  ): Promise<NotificationsResponse> => {
    const params = new URLSearchParams();

    if (filters?.limit) {
      params.append('limit', filters.limit.toString());
    }
    if (filters?.cursor) {
      params.append('cursor', filters.cursor);
    }
    if (filters?.unreadOnly !== undefined) {
      params.append('unreadOnly', filters.unreadOnly.toString());
    }

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const { data } = await api.get<NotificationsResponse>(
      `/workspaces/${workspaceId}/me/notifications${queryString}`,
    );
    return data;
  },

  getInitialNotifications: async (
    workspaceId: string,
    limit: number = 50,
  ): Promise<NotificationsResponse> => {
    return notificationsApi.getNotifications(workspaceId, {
      limit,
      unreadOnly: false,
    });
  },

  getUnreadNotifications: async (
    workspaceId: string,
    limit: number = 50,
    cursor?: string,
  ): Promise<NotificationsResponse> => {
    return notificationsApi.getNotifications(workspaceId, {
      limit,
      unreadOnly: true,
      cursor,
    });
  },

  markNotificationAsRead: async (
    workspaceId: string,
    notificationIds: string[],
  ): Promise<MarkNotificationReadResponse> => {
    const { data } = await api.patch<MarkNotificationReadResponse>(
      `/workspaces/${workspaceId}/me/notifications/read`,
      { notificationIds },
    );
    return data;
  },

  markAllNotificationsAsRead: async (
    workspaceId: string,
  ): Promise<MarkAllNotificationsReadResponse> => {
    const { data } = await api.patch<MarkAllNotificationsReadResponse>(
      `/workspaces/${workspaceId}/me/notifications/mark-all-read`,
    );
    return data;
  },

  getUnreadCount: async (workspaceId: string): Promise<{ unread_count: number }> => {
    const { data } = await api.get<{ unread_count: number }>(
      `/workspaces/${workspaceId}/me/notifications/unread-count`,
    );
    return data;
  },
};
