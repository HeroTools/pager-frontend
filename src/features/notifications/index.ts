// Main notification service (handles both web and native notifications automatically)
export { notificationService } from './services/notification-service';

// Individual services (if you need specific control)
export { browserNotificationService } from './services/browser-notification-service';
export { nativeNotificationService } from './services/native-notification-service';

// Hooks
export { useNotificationPermissions } from './hooks/use-notification-permissions';
export { useNotifications } from './hooks/use-notifications'; // Your existing API hooks
export { useRealtimeNotifications } from './hooks/use-realtime-notifications';

// Types
export type { NotificationEntity } from './types';