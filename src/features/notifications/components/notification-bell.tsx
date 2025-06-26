"use client";

import { useState } from "react";
import { Bell, X, MessageSquare, Users, Reply, AtSign } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotificationStore } from "../store/notifications";
import { useMarkNotificationAsRead } from "../hooks/use-notifications";
import NotificationItem from "./notification-item";
import { useWorkspaceId } from "@/hooks/use-workspace-id";

interface NotificationData {
  id: string;
  type: "mention" | "direct_message" | "channel_message" | "thread_reply";
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  workspace_id: string;
  related_message_id?: string;
  related_channel_id?: string;
  related_conversation_id?: string;
}

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotificationStore();
  const router = useRouter();
  const workspaceId = useWorkspaceId();

  // API hook for marking notifications as read on the server
  const markAsReadMutation = useMarkNotificationAsRead();

  const handleNotificationClick = async (notification: NotificationData) => {
    // Mark as read locally and on server
    if (!notification.is_read) {
      markAsRead(notification.id);
      //   markAsReadMutation.mutate(notification.id);
    }

    if (notification.related_channel_id) {
      router.push(`/${workspaceId}/c-${notification.related_channel_id}`);
    } else if (notification.related_conversation_id) {
      router.push(`/${workspaceId}/d-${notification.related_conversation_id}`);
    }

    setIsOpen(false);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
    // TODO: Also call API to mark all as read on server
    setIsOpen(false);
  };

  const getNotificationIcon = (type: NotificationData["type"]) => {
    switch (type) {
      case "mention":
        return <AtSign className="h-4 w-4 text-blue-500" />;
      case "direct_message":
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case "channel_message":
        return <Users className="h-4 w-4 text-orange-500" />;
      case "thread_reply":
        return <Reply className="h-4 w-4 text-purple-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-8 w-8 p-0 hover:bg-accent"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-sm">Notifications</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs h-6 px-2"
              >
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
              <p className="text-xs">
                You'll see notifications here when you receive mentions,
                messages, and replies.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={() => handleNotificationClick(notification)}
                  icon={getNotificationIcon(notification.type)}
                  timeAgo={formatTimeAgo(notification.created_at)}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="p-3 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs h-8"
              onClick={() => {
                // TODO: Navigate to full notifications page
                setIsOpen(false);
              }}
            >
              View all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
