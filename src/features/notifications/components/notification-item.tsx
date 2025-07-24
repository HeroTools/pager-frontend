import type { FC } from 'react';
import type { NotificationData } from '../types';

interface NotificationItemProps {
  notification: NotificationData;
  onClick: () => void;
  icon: React.ReactNode;
  timeAgo: string;
}

const NotificationItem: FC<NotificationItemProps> = ({ notification, onClick, icon, timeAgo }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full p-3 text-left hover:bg-accent transition-colors ${
        !notification.is_read ? 'bg-accent-info/10' : ''
      }`}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0 mt-0.5">{icon}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className={`text-sm font-medium leading-tight ${
                !notification.is_read ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {notification.title}
            </p>

            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-xs text-muted-foreground">{timeAgo}</span>
              {!notification.is_read && <div className="w-2 h-2 bg-accent-info rounded-full" />}
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notification.message}</p>
        </div>
      </div>
    </button>
  );
};

export default NotificationItem;
