import type { NotificationEntity } from "@/features/notifications/types";
import { getNotificationPreferences } from "@/features/notifications/components/notification-settings";

interface ShowNotificationOptions {
  notification: NotificationEntity;
  workspaceId: string;
  onClickCallback?: () => void;
}

class BrowserNotificationService {
  private static instance: BrowserNotificationService;
  private activeNotifications: Map<string, Notification> = new Map();
  private notificationClickHandlers: Map<string, () => void> = new Map();

  private constructor() {
    // Set up global click handler for notifications
    if (typeof window !== "undefined" && "Notification" in window) {
      // Listen for notification clicks
      self.addEventListener("notificationclick", (event: any) => {
        const notificationId = event.notification?.tag;
        if (
          notificationId &&
          this.notificationClickHandlers.has(notificationId)
        ) {
          const handler = this.notificationClickHandlers.get(notificationId);
          handler?.();
          this.notificationClickHandlers.delete(notificationId);
        }
      });
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
    // Check if notifications are supported and granted
    if (!this.canShowNotifications()) {
      return;
    }

    // Check user preferences
    const preferences = getNotificationPreferences();

    // Check if desktop notifications are enabled in preferences
    if (!preferences.desktopEnabled) {
      return;
    }

    // Check quiet hours
    if (preferences.quietHoursEnabled) {
      if (
        this.isInQuietHours(
          preferences.quietHoursStart,
          preferences.quietHoursEnd
        )
      ) {
        console.log("Notification suppressed due to quiet hours");
        return;
      }
    }

    // Check if only mentions/DMs preference is enabled
    if (preferences.onlyMentions) {
      // Check if this is a mention or direct message
      const isMention =
        notification.title.includes("@") || notification.message.includes("@");
      const isDirectMessage = notification.related_conversation_id != null;

      if (!isMention && !isDirectMessage) {
        console.log("Notification suppressed - only mentions/DMs enabled");
        return;
      }
    }

    try {
      // Create a unique tag for this notification
      const tag = `notification-${notification.id}`;

      // Build the notification options
      const options: NotificationOptions = {
        body: notification.message,
        icon: "/favicon.ico", // Update with your app icon
        badge: "/badge-icon.png", // Update with your badge icon
        tag,
        requireInteraction: false,
        silent: false,
        // renotify: false,
        data: {
          notificationId: notification.id,
          workspaceId,
          channelId: notification.related_channel_id,
          conversationId: notification.related_conversation_id,
          timestamp: new Date().toISOString(),
        },
      };

      // Create the browser notification
      const browserNotification = new Notification(notification.title, options);

      // Store the notification instance
      this.activeNotifications.set(notification.id, browserNotification);

      // Handle notification click
      browserNotification.onclick = () => {
        // Focus the window
        window.focus();

        // Navigate to the relevant channel/conversation if needed
        if (onClickCallback) {
          onClickCallback();
        } else {
          this.handleDefaultClick(notification, workspaceId);
        }

        // Close the notification
        browserNotification.close();
        this.activeNotifications.delete(notification.id);
      };

      // Handle notification close
      browserNotification.onclose = () => {
        this.activeNotifications.delete(notification.id);
        this.notificationClickHandlers.delete(tag);
      };

      // Handle notification error
      browserNotification.onerror = (error) => {
        console.error("Browser notification error:", error);
        this.activeNotifications.delete(notification.id);
        this.notificationClickHandlers.delete(tag);
      };

      // Store click handler if provided
      if (onClickCallback) {
        this.notificationClickHandlers.set(tag, onClickCallback);
      }

      // Auto-close notification after 10 seconds
      setTimeout(() => {
        if (this.activeNotifications.has(notification.id)) {
          browserNotification.close();
          this.activeNotifications.delete(notification.id);
          this.notificationClickHandlers.delete(tag);
        }
      }, 10000);

      // Play notification sound if enabled
      if (preferences.soundEnabled) {
        this.playNotificationSound();
      }
    } catch (error) {
      console.error("Error showing browser notification:", error);
    }
  }

  private isInQuietHours(startTime: string, endTime: string): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    const startTimeInMinutes = startHour * 60 + startMinute;
    const endTimeInMinutes = endHour * 60 + endMinute;

    // Handle case where quiet hours span midnight
    if (startTimeInMinutes > endTimeInMinutes) {
      // Quiet hours span midnight (e.g., 22:00 to 08:00)
      return (
        currentTimeInMinutes >= startTimeInMinutes ||
        currentTimeInMinutes < endTimeInMinutes
      );
    } else {
      // Normal case (e.g., 08:00 to 17:00)
      return (
        currentTimeInMinutes >= startTimeInMinutes &&
        currentTimeInMinutes < endTimeInMinutes
      );
    }
  }

  private canShowNotifications(): boolean {
    return (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
    );
  }

  private handleDefaultClick(
    notification: NotificationEntity,
    workspaceId: string
  ): void {
    // Default click behavior - navigate to the relevant channel/conversation
    const baseUrl = window.location.origin;

    if (notification.related_channel_id) {
      window.location.href = `${baseUrl}/workspace/${workspaceId}/channel/${notification.related_channel_id}`;
    } else if (notification.related_conversation_id) {
      window.location.href = `${baseUrl}/workspace/${workspaceId}/member/${notification.related_conversation_id}`;
    } else {
      // Just focus the window if no specific destination
      window.focus();
    }
  }

  private playNotificationSound(): void {
    try {
      // Create an audio element to play the notification sound
      const audio = new Audio("/sounds/channel.mp3"); // You'll need to add this file to your public folder
      audio.volume = 0.5; // Set reasonable volume
      audio.play().catch((error) => {
        console.warn("Could not play notification sound:", error);
      });
    } catch (error) {
      console.warn("Error creating notification sound:", error);
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

export const browserNotificationService =
  BrowserNotificationService.getInstance();
