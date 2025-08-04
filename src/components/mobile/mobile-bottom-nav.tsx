'use client';

import { Home, MessageSquare, FileText, Bell } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/general';
import { useWorkspaceId } from '@/hooks/use-workspace-id';
import { useUIStore } from '@/stores/ui-store';

export function MobileBottomNav() {
  const pathname = usePathname();
  const workspaceId = useWorkspaceId();
  const { setNotificationsPanelOpen, isNotificationsPanelOpen } = useUIStore();

  if (!workspaceId) return null;

  const navItems = [
    {
      icon: Home,
      label: 'Home',
      href: `/${workspaceId}`,
      isActive: pathname === `/${workspaceId}`,
    },
    {
      icon: MessageSquare,
      label: 'DMs',
      href: `/${workspaceId}`,
      isActive: pathname.includes('/dm-') || pathname.includes('/conversation'),
    },
    {
      icon: FileText,
      label: 'Drafts',
      href: `/${workspaceId}/drafts`,
      isActive: pathname === `/${workspaceId}/drafts`,
    },
    {
      icon: Bell,
      label: 'Activity',
      href: '#',
      isActive: isNotificationsPanelOpen,
      onClick: () => setNotificationsPanelOpen(!isNotificationsPanelOpen),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
      <div className="flex h-14">
        {navItems.map((item) => {
          const Icon = item.icon;
          
          if (item.onClick) {
            return (
              <button
                key={item.label}
                onClick={item.onClick}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 text-muted-foreground transition-colors',
                  item.isActive && 'text-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px]">{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 text-muted-foreground transition-colors',
                item.isActive && 'text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}