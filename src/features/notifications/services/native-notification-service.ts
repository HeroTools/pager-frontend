import type { NotificationEntity } from '@/features/notifications/types';
import { isElectron } from '@/lib/electron/navigation';

interface ShowNativeNotificationParams {
  notification: NotificationEntity;
  workspaceId: string;
  onClickCallback?: () => void;
  onActionCallback?: (action: string) => void;
}

interface NativeNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  sound?: string;
  urgency?: 'normal' | 'critical' | 'low';
  category?: string;
  threadId?: string;
  timeoutType?: 'default' | 'never';
  actions?: Array<{
    type: 'button';
    text: string;
    id: string;
  }>;
}

class NativeNotificationService {
  private activeNotifications: Map<string, string> = new Map();

  async showNativeNotification({
    notification,
    workspaceId,
    onClickCallback,
    onActionCallback,
  }: ShowNativeNotificationParams): Promise<boolean> {
    if (!isElectron() || !window.electronAPI?.showNativeNotification) {
      console.warn('Native notifications not supported in this environment');
      return false;
    }

    try {
      // Platform-specific notification options
      const options: NativeNotificationOptions = {
        title: notification.title,
        body: notification.message,
        icon: this.getIconPath(),
        sound: this.getSoundName(),
        urgency: this.getUrgency(notification),
        category: this.getCategory(notification),
        threadId: workspaceId, // Group notifications by workspace
        timeoutType: 'default',
        actions: this.getActions(notification),
      };

      const notificationId = await window.electronAPI.showNativeNotification(
        notification.id,
        options
      );

      if (notificationId) {
        this.activeNotifications.set(notification.id, notificationId);

        // Set up click handlers
        if (onClickCallback) {
          window.electronAPI.onNotificationClick?.(notificationId, onClickCallback);
        }

        if (onActionCallback) {
          window.electronAPI.onNotificationAction?.(notificationId, onActionCallback);
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error showing native notification:', error);
      return false;
    }
  }

  async closeNativeNotification(notificationId: string): Promise<void> {
    if (!isElectron() || !window.electronAPI?.closeNativeNotification) {
      return;
    }

    const nativeId = this.activeNotifications.get(notificationId);
    if (nativeId) {
      await window.electronAPI.closeNativeNotification(nativeId);
      this.activeNotifications.delete(notificationId);
    }
  }

  async closeAllNativeNotifications(): Promise<void> {
    if (!isElectron() || !window.electronAPI?.closeAllNativeNotifications) {
      return;
    }

    await window.electronAPI.closeAllNativeNotifications();
    this.activeNotifications.clear();
  }

  private getIconPath(): string {
    // Platform-specific icon paths
    const platform = window.electronAPI?.platform;
    
    switch (platform) {
      case 'darwin': // macOS
        return './public/icon.icns';
      case 'win32': // Windows
        return './public/icon.ico';
      default: // Linux
        return './public/icon.png';
    }
  }

  private getSoundName(): string {
    // Use platform-appropriate sound names
    const platform = window.electronAPI?.platform;
    
    switch (platform) {
      case 'darwin': // macOS
        return 'Submarine'; // Built-in macOS sound
      case 'win32': // Windows
        return 'ms-winsoundevent:Notification.Default';
      default: // Linux
        return 'message-new-instant'; // freedesktop sound
    }
  }

  private getUrgency(notification: NotificationEntity): 'normal' | 'critical' | 'low' {
    // Determine urgency based on notification type
    if (notification.type === 'mention' || notification.type === 'direct_message') {
      return 'normal';
    }
    return 'low';
  }

  private getCategory(notification: NotificationEntity): string {
    // Platform-specific categories for better OS integration
    const platform = window.electronAPI?.platform;
    
    switch (platform) {
      case 'darwin': // macOS
        return 'im.received'; // Instant message category
      case 'win32': // Windows
        return 'im'; // Communication category
      default: // Linux
        return 'im.received'; // freedesktop category
    }
  }

  private getActions(notification: NotificationEntity): Array<{ type: 'button'; text: string; id: string }> {
    // Platform-appropriate actions
    const platform = window.electronAPI?.platform;
    
    if (platform === 'darwin') {
      // macOS supports rich actions
      return [
        { type: 'button', text: 'Reply', id: 'reply' },
        { type: 'button', text: 'Mark as Read', id: 'mark_read' },
      ];
    }
    
    if (platform === 'win32') {
      // Windows 10+ supports actions
      return [
        { type: 'button', text: 'View', id: 'view' },
        { type: 'button', text: 'Dismiss', id: 'dismiss' },
      ];
    }

    // Linux support varies, keep it simple
    return [];
  }

  // Check if native notifications are available and properly configured
  async isNativeNotificationSupported(): Promise<boolean> {
    if (!isElectron() || !window.electronAPI?.checkNativeNotificationSupport) {
      return false;
    }

    return await window.electronAPI.checkNativeNotificationSupport();
  }

  // Request native notification permissions (mainly for macOS)
  async requestNativeNotificationPermission(): Promise<boolean> {
    if (!isElectron() || !window.electronAPI?.requestNativeNotificationPermission) {
      return false;
    }

    return await window.electronAPI.requestNativeNotificationPermission();
  }
}

export const nativeNotificationService = new NativeNotificationService();