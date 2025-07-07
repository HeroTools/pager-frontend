import { create } from 'zustand';
import { soundManager } from '@/features/notifications/lib/sound-manager';
import { tabBadgeManager } from '@/features/notifications/lib/tab-badge-manager';
import type { NotificationData } from '../types';

interface NotificationStore {
  notifications: NotificationData[];
  unreadCount: number;
  isLoading: boolean;

  // Actions
  addNotification: (notification: NotificationData) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  removeNotification: (notificationId: string) => void;
  setNotifications: (notifications: NotificationData[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  addNotification: (notification) => {
    console.log('🔔 New notification:', notification.title, `(${notification.type})`);

    const { notifications } = get();

    // Prevent duplicates
    const exists = notifications.some((n) => n.id === notification.id);
    if (exists) {
      return;
    }

    set((state) => {
      const newUnreadCount = notification.is_read ? state.unreadCount : state.unreadCount + 1;

      if (!notification.is_read) {
        // Play type-specific sound
        soundManager.playNotificationSound(notification.type);

        // Update tab badge
        tabBadgeManager.setUnreadCount(newUnreadCount);
      }

      return {
        notifications: [notification, ...state.notifications],
        unreadCount: newUnreadCount,
      };
    });
  },

  markAsRead: (notificationId) => {
    set((state) => {
      const updatedNotifications = state.notifications.map((n) =>
        n.id === notificationId ? { ...n, is_read: true } : n,
      );

      const newUnreadCount = updatedNotifications.filter((n) => !n.is_read).length;
      tabBadgeManager.setUnreadCount(newUnreadCount);

      return {
        notifications: updatedNotifications,
        unreadCount: newUnreadCount,
      };
    });
  },

  markAllAsRead: () => {
    set((state) => {
      tabBadgeManager.clearBadge();

      return {
        notifications: state.notifications.map((n) => ({
          ...n,
          is_read: true,
        })),
        unreadCount: 0,
      };
    });
  },

  removeNotification: (notificationId) => {
    set((state) => {
      const notification = state.notifications.find((n) => n.id === notificationId);
      const wasUnread = notification && !notification.is_read;

      const newUnreadCount = wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount;
      tabBadgeManager.setUnreadCount(newUnreadCount);

      return {
        notifications: state.notifications.filter((n) => n.id !== notificationId),
        unreadCount: newUnreadCount,
      };
    });
  },

  setNotifications: (notifications) => {
    const unreadCount = notifications.filter((n) => !n.is_read).length;
    tabBadgeManager.setUnreadCount(unreadCount);
    set({ notifications, unreadCount });
  },

  setLoading: (isLoading) => {
    set({ isLoading });
  },
}));
