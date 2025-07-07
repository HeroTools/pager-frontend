import type { LucideIcon } from 'lucide-react';
import type { IconType } from 'react-icons/lib';
import { NotificationBadge } from '@/components/notification-badge';
import { cn } from '@/lib/utils';

interface SidebarButtonProps {
  icon: LucideIcon | IconType;
  label: string;
  isActive?: boolean;
  disabled?: boolean;
  badge?: number;
  onClick?: () => void;
}

export const SidebarButton = ({
  icon: Icon,
  label,
  isActive,
  disabled,
  badge,
  onClick,
}: SidebarButtonProps) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-y-0.5 cursor-pointer group',
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
      )}
      onClick={!disabled ? onClick : undefined}
    >
      <div
        className={cn(
          'size-9 p-2 relative transition-colors rounded-md flex items-center justify-center',
          'group-hover:bg-foreground/10',
          isActive && 'bg-foreground/15',
        )}
      >
        <Icon className="size-5 text-foreground" />
        <NotificationBadge count={badge || 0} />
      </div>
      <span className="text-[11px] text-foreground">{label}</span>
    </div>
  );
};
