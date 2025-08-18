import type { NotificationEntity } from '@/features/notifications/types';
import { isElectron } from '@/lib/electron/navigation';
import { browserNotificationService } from './browser-notification-service';
import { nativeNotificationService } from './native-notification-service';

interface ShowNotificationParams {
  notification: NotificationEntity;
  workspaceId: string;
  onClickCallback?: () => void;
  onActionCallback?: (action: string) => void;
}

class NotificationService {
  private useNativeNotifications = false;

  async initialize(): Promise<void> {
    if (isElectron()) {
      // Check if native notifications are supported and preferred
      this.useNativeNotifications = await nativeNotificationService.isNativeNotificationSupported();
      
      if (this.useNativeNotifications) {
        // Request permission for native notifications
        const hasPermission = await nativeNotificationService.requestNativeNotificationPermission();
        if (!hasPermission) {
          console.warn('Native notification permission denied, falling back to web notifications');
          this.useNativeNotifications = false;
        }
      }
    }
  }

  async showNotification({
    notification,
    workspaceId,
    onClickCallback,
    onActionCallback,
  }: ShowNotificationParams): Promise<boolean> {
    // Try native notifications first if available and in Electron
    if (this.useNativeNotifications && isElectron()) {
      const success = await nativeNotificationService.showNativeNotification({
        notification,
        workspaceId,
        onClickCallback,
        onActionCallback,
      });

      if (success) {
        console.log('Showed native notification:', notification.id);
        return true;
      } else {
        console.warn('Native notification failed, falling back to web notification');
      }
    }

    // Fallback to web notifications
    try {
      await browserNotificationService.showNotification({
        notification,
        workspaceId,
        onClickCallback,
      });
      console.log('Showed web notification:', notification.id);
      return true;
    } catch (error) {
      console.error('Failed to show notification:', error);
      return false;
    }
  }

  async closeNotification(notificationId: string): Promise<void> {
    // Try to close both native and web notifications
    if (this.useNativeNotifications && isElectron()) {
      await nativeNotificationService.closeNativeNotification(notificationId);
    }
    
    browserNotificationService.closeNotification(notificationId);
  }

  async closeAllNotifications(): Promise<void> {
    // Close both native and web notifications
    if (this.useNativeNotifications && isElectron()) {
      await nativeNotificationService.closeAllNativeNotifications();
    }
    
    browserNotificationService.closeAllNotifications();
  }

  // Get notification capabilities for the current environment
  getCapabilities() {
    return {
      isElectron: isElectron(),
      hasNativeSupport: this.useNativeNotifications,
      hasWebSupport: typeof window !== 'undefined' && 'Notification' in window,
      preferredType: this.useNativeNotifications ? 'native' : 'web',
      supportedActions: this.useNativeNotifications ? ['reply', 'mark_read', 'view'] : ['view'],
    };
  }

  // Check if notifications are available at all
  isNotificationSupported(): boolean {
    if (isElectron()) {
      return this.useNativeNotifications || ('Notification' in window);
    }
    
    return typeof window !== 'undefined' && 'Notification' in window;
  }
}

export const notificationService = new NotificationService();