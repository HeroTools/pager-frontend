import type { NotificationEntity } from '@/features/notifications/types';
import { isElectron, showNotification as showElectronNotification } from '@/lib/electron';

interface ShowNotificationParams {
  notification: NotificationEntity;
  workspaceId: string;
  onClickCallback?: () => void;
}

interface ShowBrowserNotificationParams {
  notification: NotificationEntity;
  onClickCallback?: () => void;
}

class BrowserNotificationService {
  private notifications: Map<string, Notification> = new Map();
  private electronNotificationCallbacks: Map<string, () => void> = new Map();

  async showNotification({
    notification,
    workspaceId,
    onClickCallback,
  }: ShowNotificationParams): Promise<void> {
    // Use Electron native notifications if available
    if (isElectron()) {
      return this.showElectronNotification({ notification, workspaceId, onClickCallback });
    }

    // Fallback to browser notifications
    return this.showBrowserNotification({ notification, onClickCallback });
  }

  private async showElectronNotification({
    notification,
    workspaceId,
    onClickCallback,
  }: ShowNotificationParams): Promise<void> {
    try {
      const success = await showElectronNotification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        data: {
          notificationId: notification.id,
          workspaceId,
          entityType: notification.type,
          entityId: notification.related_channel_id || notification.related_message_id,
        },
      });

      if (success && onClickCallback) {
        this.electronNotificationCallbacks.set(notification.id, onClickCallback);
        
        // Listen for notification clicks
        if (typeof window !== 'undefined' && window.electronAPI) {
          window.electronAPI.onNotificationClicked((_event, data) => {
            if (data.notificationId === notification.id) {
              onClickCallback();
              this.electronNotificationCallbacks.delete(notification.id);
            }
          });
        }
      }
    } catch (error) {
      console.error('Error showing Electron notification:', error);
    }
  }

  private async showBrowserNotification({
    notification,
    onClickCallback,
  }: ShowBrowserNotificationParams): Promise<void> {
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
    // Clean up browser notification
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.close();
      this.notifications.delete(notificationId);
    }

    // Clean up Electron notification callback
    this.electronNotificationCallbacks.delete(notificationId);
  }

  closeAllNotifications(): void {
    // Close all browser notifications
    this.notifications.forEach((notification) => {
      notification.close();
    });
    this.notifications.clear();

    // Clear all Electron notification callbacks
    this.electronNotificationCallbacks.clear();
  }
}

export const browserNotificationService = new BrowserNotificationService();
