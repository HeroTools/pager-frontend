import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface NotificationBadgeProps {
  count: number;
  show?: boolean;
  className?: string;
}

export const NotificationBadge = ({
  count,
  show = count > 0,
  className,
}: NotificationBadgeProps) => {
  if (!show) {
    return null;
  }

  return (
    <Badge
      variant="danger"
      className={cn(
        'absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs ',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </Badge>
  );
};
