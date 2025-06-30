import { useMemo } from "react";
import { useNotifications } from "./use-notifications";

export function useChannelNotifications(workspaceId: string) {
  const { data: notifications } = useNotifications({
    workspaceId,
    unreadOnly: false,
  });

  const channelsWithUnread = useMemo(() => {
    const unreadChannels = new Set<string>();

    for (const page of notifications?.pages || []) {
      for (const notification of page.notifications) {
        if (!notification.is_read && notification.related_channel_id) {
          unreadChannels.add(notification.related_channel_id);
        }
      }
    }

    return unreadChannels;
  }, [notifications]);

  const hasChannelUnread = (channelId: string) =>
    channelsWithUnread.has(channelId);

  return {
    hasChannelUnread,
  };
}
