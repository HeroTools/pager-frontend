import type { NotificationEntity } from '@/features/notifications/types';
import { isElectron } from '@/lib/electron/navigation';

interface ShowNotificationParams {
  notification: NotificationEntity;
  workspaceId: string;
  onClickCallback?: () => void;
}

class ElectronNotificationService {
  private notifications: Map<string, Notification> = new Map();

  async showNotification({
    notification,
    workspaceId,
    onClickCallback,
  }: ShowNotificationParams): Promise<void> {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.warn('Browser notifications not supported');
      return;
    }

    // In Electron, check permission and request if needed
    let permission = Notification.permission;
    
    if (permission === 'default') {
      // Auto-request permission in Electron (more seamless UX)
      if (isElectron()) {
        try {
          permission = await Notification.requestPermission();
        } catch (error) {
          console.warn('Failed to request notification permission:', error);
          return;
        }
      } else {
        console.warn('Notification permission not requested yet');
        return;
      }
    }

    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    try {
      // Enhanced notification options for Electron
      const notificationOptions: NotificationOptions = {
        body: notification.message,
        icon: isElectron() ? './public/favicon.ico' : '/favicon.ico',
        badge: isElectron() ? './public/badge-icon.png' : '/badge-icon.png',
        tag: notification.id,
        requireInteraction: false,
        silent: false,
        // Electron-specific enhancements
        ...(isElectron() && {
          // In Electron, we can use more native-like behavior
          requireInteraction: true, // Keep notification visible until user interacts
          actions: [
            {
              action: 'view',
              title: 'View',
              icon: './public/favicon.ico'
            }
          ]
        })
      };

      const browserNotification = new Notification(notification.title, notificationOptions);

      this.notifications.set(notification.id, browserNotification);

      browserNotification.onclick = () => {
        console.log('Notification clicked:', notification.id);
        
        // In Electron, bring window to front when notification is clicked
        if (isElectron() && window.electronAPI?.focusWindow) {
          window.electronAPI.focusWindow();
        }
        
        onClickCallback?.();
        browserNotification.close();
        this.notifications.delete(notification.id);
      };

      browserNotification.onclose = () => {
        this.notifications.delete(notification.id);
      };

      browserNotification.onerror = (error) => {
        console.error('Notification error:', error);
        this.notifications.delete(notification.id);
      };

      // Shorter auto-close for Electron (5 seconds vs 10)
      const autoCloseTime = isElectron() ? 5000 : 10000;
      setTimeout(() => {
        if (this.notifications.has(notification.id)) {
          browserNotification.close();
          this.notifications.delete(notification.id);
        }
      }, autoCloseTime);

    } catch (error) {
      console.error('Error showing notification:', error);
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

  // Electron-specific: Check if we should auto-request permissions
  async checkAndRequestPermissions(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    // In Electron, we can be more aggressive about requesting permissions
    if (isElectron()) {
      try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      } catch (error) {
        console.error('Failed to request notification permission:', error);
        return false;
      }
    }

    return false;
  }
}

export const electronNotificationService = new ElectronNotificationService();