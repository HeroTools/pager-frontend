import { useCallback, useEffect, useState } from 'react';
import { isElectron } from '@/lib/electron/navigation';

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

interface UseNotificationPermissionsReturn {
  permission: NotificationPermissionState;
  requestPermission: () => Promise<NotificationPermissionState>;
  isSupported: boolean;
  hasAskedBefore: boolean;
  setHasAskedBefore: (value: boolean) => void;
}

export const useNotificationPermissions = (): UseNotificationPermissionsReturn => {
  const [permission, setPermission] = useState<NotificationPermissionState>('default');
  const [hasAskedBefore, setHasAskedBefore] = useState(false);

  const isSupported = typeof window !== 'undefined' && 'Notification' in window;

  useEffect(() => {
    if (!isSupported) {
      setPermission('unsupported');
      return;
    }

    // Check if we've asked before (stored in localStorage)
    const hasAsked = localStorage.getItem('notification_permission_asked') === 'true';
    setHasAskedBefore(hasAsked);

    // Get current permission state
    const currentPermission = Notification.permission as NotificationPermissionState;
    setPermission(currentPermission);
  }, [isSupported]);

  const requestPermission = useCallback(async (): Promise<NotificationPermissionState> => {
    if (!isSupported) {
      return 'unsupported';
    }

    try {
      // Mark that we've asked for permission
      localStorage.setItem('notification_permission_asked', 'true');
      setHasAskedBefore(true);

      // In Electron, notifications are more permissive
      if (isElectron()) {
        // Check if we have the Electron API for notifications
        if (window.electronAPI?.requestNotificationPermission) {
          const result = await window.electronAPI.requestNotificationPermission();
          const newPermission = result as NotificationPermissionState;
          setPermission(newPermission);
          return newPermission;
        }
      }

      // Standard web notification request
      const result = await Notification.requestPermission();
      const newPermission = result as NotificationPermissionState;
      setPermission(newPermission);

      return newPermission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return permission;
    }
  }, [isSupported, permission]);

  return {
    permission,
    requestPermission,
    isSupported,
    hasAskedBefore,
    setHasAskedBefore,
  };
};
