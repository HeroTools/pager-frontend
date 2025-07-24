import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  AtSign,
  Bell,
  CheckCheck,
  Hash,
  Loader,
  MessageCircle,
  X,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/features/notifications/hooks/use-notifications';
import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
} from '@/features/notifications/hooks/use-notifications-mutations';
import type { NotificationEntity } from '@/features/notifications/types';

interface NotificationsSidebarProps {
  workspaceId: string;
  onClose: () => void;
}

export const NotificationsSidebar = ({ workspaceId, onClose }: NotificationsSidebarProps) => {
  const router = useRouter();
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);

  const {
    data: notifications,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotifications({
    workspaceId,
    unreadOnly: false,
  });

  const markAllAsRead = useMarkAllNotificationsAsRead();
  const markAsRead = useMarkNotificationAsRead();

  const allNotifications = notifications?.pages?.flatMap((page) => page.notifications) || [];
  const hasUnread = allNotifications.some((n) => !n.is_read);

  const handleMarkAllAsRead = async () => {
    if (!hasUnread) {
      return;
    }

    setMarkingAllAsRead(true);
    try {
      await markAllAsRead.mutateAsync(workspaceId);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setMarkingAllAsRead(false);
    }
  };

  const handleNotificationClick = async (notification: NotificationEntity) => {
    if (notification.related_conversation_id) {
      router.push(`/${workspaceId}/d-${notification.related_conversation_id}`);
    } else if (notification.related_channel_id) {
      router.push(`/${workspaceId}/c-${notification.related_channel_id}`);
    }
    if (!notification.is_read) {
      try {
        await markAsRead.mutateAsync({
          notificationIds: [notification.id],
          workspaceId,
        });
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }
  };

  const getNotificationIcon = (type: NotificationEntity['type']) => {
    switch (type) {
      case 'mention':
        return <AtSign className="size-4" />;
      case 'direct_message':
        return <MessageCircle className="size-4" />;
      case 'channel_message':
        return <Hash className="size-4" />;
      case 'thread_reply':
        return <MessageCircle className="size-4" />;
      default:
        return <Bell className="size-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="flex items-center justify-between p-2 border-b border">
          <h2 className="text-lg font-semibold text-foreground">Activity</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader className="size-6 text-muted-foreground animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-2 border-b border">
          <h2 className="text-lg font-semibold text-foreground">Activity</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <AlertTriangle className="size-8 text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-center">Failed to load notifications</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-workspace-sidebar">
      <div className="flex items-center justify-between p-2 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Activity</h2>
        <div className="flex items-center gap-2">
          {hasUnread && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markingAllAsRead}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {markingAllAsRead ? (
                <Loader className="size-3 animate-spin mr-1" />
              ) : (
                <CheckCheck className="size-3 mr-1" />
              )}
              Mark all read
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {allNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="size-12 bg-muted rounded-full flex items-center justify-center mb-4">
              <CheckCheck className="size-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-foreground mb-1">All caught up!</h3>
            <p className="text-sm text-muted-foreground">No new notifications to show</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {allNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={cn(
                  'flex items-start gap-3 p-2 cursor-pointer transition-all duration-150 hover:bg-muted/50 relative',
                  !notification.is_read && 'bg-muted/30',
                )}
              >
                {!notification.is_read && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />
                )}

                <div className="flex-shrink-0 mt-1">
                  <div
                    className={cn(
                      'text-muted-foreground transition-colors',
                      !notification.is_read && 'text-foreground',
                    )}
                  >
                    {getNotificationIcon(notification.type)}
                  </div>
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4
                      className={cn(
                        'text-sm font-medium truncate text-foreground',
                        !notification.is_read && 'font-semibold',
                      )}
                    >
                      {notification.title}
                    </h4>
                    {!notification.is_read && (
                      <div className="size-1.5 bg-primary rounded-full flex-shrink-0" />
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {notification.message}
                  </p>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-0.5">
                    <span>
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                    {notification.channel_name && (
                      <>
                        <span>•</span>
                        <span className="text-muted-foreground">#{notification.channel_name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {hasNextPage && (
              <div className="p-2 text-center border-t border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {isFetchingNextPage ? <Loader className="size-4 animate-spin mr-2" /> : null}
                  Load more
                </Button>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
