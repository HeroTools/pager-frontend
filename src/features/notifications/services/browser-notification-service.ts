import type { NotificationEntity } from '@/features/notifications/types';

interface ShowNotificationParams {
  notification: NotificationEntity;
  workspaceId: string;
  onClickCallback?: () => void;
}

class BrowserNotificationService {
  private notifications: Map<string, Notification> = new Map();

  async showNotification({
    notification,
    workspaceId,
    onClickCallback,
  }: ShowNotificationParams): Promise<void> {
    if (!('Notification' in window)) {
      console.warn('Browser notifications not supported');
      return;
    }

    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    try {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico', // Update with your app icon
        badge: '/badge-icon.png', // Update with your badge icon
        tag: notification.id,
        requireInteraction: false,
        silent: false,
      });

      this.notifications.set(notification.id, browserNotification);

      browserNotification.onclick = () => {
        console.log('Notification clicked:', notification.id);
        onClickCallback?.();
        browserNotification.close();
        this.notifications.delete(notification.id);
      };

      browserNotification.onclose = () => {
        this.notifications.delete(notification.id);
      };

      // Auto-close after 10 seconds
      setTimeout(() => {
        if (this.notifications.has(notification.id)) {
          browserNotification.close();
          this.notifications.delete(notification.id);
        }
      }, 10000);
    } catch (error) {
      console.error('Error showing browser notification:', error);
    }
  }

  closeNotification(notificationId: string): void {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.close();
      this.notifications.delete(notificationId);
    }
  }

  closeAllNotifications(): void {
    this.notifications.forEach((notification) => {
      notification.close();
    });
    this.notifications.clear();
  }
}

export const browserNotificationService = new BrowserNotificationService();
