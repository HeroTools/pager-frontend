import { useEffect } from "react";
import { useNotificationContext } from "./use-notification-context";
import { useFocusNotificationManager } from "./use-focus-notification-manager";

interface UseFocusAwareNotificationsProps {
  enabled?: boolean;
}

/**
 * Main hook that orchestrates focus-aware notification behavior.
 *
 * Features:
 * - Automatically marks notifications as read when browser regains focus
 * - Provides context about current entity and focus state
 * - Handles the logic for when to show notifications vs just toasts
 */
export const useFocusAwareNotifications = ({
  enabled = true,
}: UseFocusAwareNotificationsProps = {}) => {
  const notificationContext = useNotificationContext();
  const { isMarkingAsRead } = useFocusNotificationManager();

  useEffect(() => {
    if (!enabled) return;
  }, [
    notificationContext.isFocused,
    notificationContext.currentEntityId,
    notificationContext.currentEntityType,
    enabled,
  ]);

  return {
    ...notificationContext,
    isMarkingAsRead,
    enabled,
  };
};
