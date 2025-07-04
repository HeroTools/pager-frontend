import type { NotificationEntity } from '@/features/notifications/types';
import { getNotificationPreferences } from '@/features/notifications/components/notification-settings';

interface ShowNotificationOptions {
  notification: NotificationEntity;
  workspaceId: string;
  onClickCallback?: () => void;
}

interface NotificationPreferences {
  desktopEnabled: boolean;
  soundEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  onlyMentions: boolean;
}

interface ExtendedNotificationOptions extends NotificationOptions {
  data?: {
    notificationId: string;
    workspaceId: string;
    channelId?: string;
    conversationId?: string;
    timestamp: string;
  };
}

class BrowserNotificationService {
  private static instance: BrowserNotificationService;
  private activeNotifications: Map<string, Notification> = new Map();
  private notificationClickHandlers: Map<string, () => void> = new Map();

  private constructor() {
    this.setupNotificationClickListener();
  }

  private setupNotificationClickListener(): void {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
          if (event.data?.type === 'NOTIFICATION_CLICK') {
            const notificationId = event.data.notificationId as string;
            if (notificationId && this.notificationClickHandlers.has(notificationId)) {
              const handler = this.notificationClickHandlers.get(notificationId);
              if (handler) {
                handler();
                this.notificationClickHandlers.delete(notificationId);
              }
            }
          }
        });
      }
    }
  }

  public static getInstance(): BrowserNotificationService {
    if (!BrowserNotificationService.instance) {
      BrowserNotificationService.instance = new BrowserNotificationService();
    }
    return BrowserNotificationService.instance;
  }

  public async showNotification({
    notification,
    workspaceId,
    onClickCallback,
  }: ShowNotificationOptions): Promise<void> {
    if (!this.canShowNotifications()) {
      return;
    }

    const preferences = getNotificationPreferences() as NotificationPreferences;

    if (!preferences.desktopEnabled) {
      return;
    }

    if (preferences.quietHoursEnabled) {
      if (this.isInQuietHours(preferences.quietHoursStart, preferences.quietHoursEnd)) {
        console.log('Notification suppressed due to quiet hours');
        return;
      }
    }

    if (preferences.onlyMentions) {
      const isMention = notification.title.includes('@') || notification.message.includes('@');
      const isDirectMessage = notification.related_conversation_id != null;

      if (!isMention && !isDirectMessage) {
        console.log('Notification suppressed - only mentions/DMs enabled');
        return;
      }
    }

    try {
      const tag = `notification-${notification.id}`;

      const options: ExtendedNotificationOptions = {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/badge-icon.png',
        tag,
        requireInteraction: false,
        silent: false,
        data: {
          notificationId: notification.id,
          workspaceId,
          channelId: notification.related_channel_id || undefined,
          conversationId: notification.related_conversation_id || undefined,
          timestamp: new Date().toISOString(),
        },
      };

      const browserNotification = new Notification(notification.title, options);

      this.activeNotifications.set(notification.id, browserNotification);

      browserNotification.onclick = (event: Event): void => {
        if (typeof window !== 'undefined') {
          window.focus();
        }

        if (onClickCallback) {
          onClickCallback();
        } else {
          this.handleDefaultClick(notification, workspaceId);
        }

        browserNotification.close();
        this.activeNotifications.delete(notification.id);
      };

      browserNotification.onclose = (): void => {
        this.activeNotifications.delete(notification.id);
        this.notificationClickHandlers.delete(tag);
      };

      browserNotification.onerror = (event: Event): void => {
        console.error('Browser notification error:', event);
        this.activeNotifications.delete(notification.id);
        this.notificationClickHandlers.delete(tag);
      };

      if (onClickCallback) {
        this.notificationClickHandlers.set(tag, onClickCallback);
      }

      setTimeout(() => {
        if (this.activeNotifications.has(notification.id)) {
          browserNotification.close();
          this.activeNotifications.delete(notification.id);
          this.notificationClickHandlers.delete(tag);
        }
      }, 10000);

      if (preferences.soundEnabled) {
        this.playNotificationSound();
      }
    } catch (error) {
      console.error('Error showing browser notification:', error);
    }
  }

  private isInQuietHours(startTime: string, endTime: string): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    const startTimeParts = startTime.split(':');
    const endTimeParts = endTime.split(':');

    if (startTimeParts.length !== 2 || endTimeParts.length !== 2) {
      console.warn('Invalid time format for quiet hours');
      return false;
    }

    const startHour = parseInt(startTimeParts[0], 10);
    const startMinute = parseInt(startTimeParts[1], 10);
    const endHour = parseInt(endTimeParts[0], 10);
    const endMinute = parseInt(endTimeParts[1], 10);

    if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) {
      console.warn('Invalid numeric values in quiet hours time');
      return false;
    }

    const startTimeInMinutes = startHour * 60 + startMinute;
    const endTimeInMinutes = endHour * 60 + endMinute;

    if (startTimeInMinutes > endTimeInMinutes) {
      return currentTimeInMinutes >= startTimeInMinutes || currentTimeInMinutes < endTimeInMinutes;
    } else {
      return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes;
    }
  }

  private canShowNotifications(): boolean {
    return (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    );
  }

  private handleDefaultClick(notification: NotificationEntity, workspaceId: string): void {
    if (typeof window === 'undefined') return;

    const baseUrl = window.location.origin;

    if (notification.related_channel_id) {
      window.location.href = `${baseUrl}/workspace/${workspaceId}/channel/${notification.related_channel_id}`;
    } else if (notification.related_conversation_id) {
      window.location.href = `${baseUrl}/workspace/${workspaceId}/member/${notification.related_conversation_id}`;
    } else {
      window.focus();
    }
  }

  private playNotificationSound(): void {
    if (typeof window === 'undefined') return;

    try {
      const audio = new Audio('/sounds/channel.mp3');
      audio.volume = 0.5;
      audio.play().catch((error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('Could not play notification sound:', errorMessage);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('Error creating notification sound:', errorMessage);
    }
  }

  public closeNotification(notificationId: string): void {
    const notification = this.activeNotifications.get(notificationId);
    if (notification) {
      notification.close();
      this.activeNotifications.delete(notificationId);
    }
  }

  public closeAllNotifications(): void {
    this.activeNotifications.forEach((notification) => {
      notification.close();
    });
    this.activeNotifications.clear();
    this.notificationClickHandlers.clear();
  }

  public getActiveNotificationCount(): number {
    return this.activeNotifications.size;
  }

  public hasActiveNotification(notificationId: string): boolean {
    return this.activeNotifications.has(notificationId);
  }
}

export const browserNotificationService = BrowserNotificationService.getInstance();
