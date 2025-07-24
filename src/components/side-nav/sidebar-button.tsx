import type { LucideIcon } from 'lucide-react';

import { NotificationBadge } from '@/components/notification-badge';
import { cn } from '@/lib/utils';

interface SidebarButtonProps {
  icon: LucideIcon;
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
          'group-hover:bg-main-sidebar-hover',
          isActive && 'bg-main-sidebar-active',
        )}
      >
        <Icon className="size-5 text-main-sidebar-foreground" />
        <NotificationBadge count={badge || 0} />
      </div>
      <span className="text-[11px] text-main-sidebar-foreground">{label}</span>
    </div>
  );
};
