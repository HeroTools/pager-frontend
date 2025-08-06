'use client';

import { Bell, FileText, Home, MessageSquare } from 'lucide-react';
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

  const handleNavClick = (action?: 'activity' | 'navigate') => {
    if (action === 'activity') {
      setNotificationsPanelOpen(!isNotificationsPanelOpen);
    } else if (isNotificationsPanelOpen) {
      setNotificationsPanelOpen(false);
    }
  };

  const navItems = [
    {
      icon: Home,
      label: 'Home',
      href: `/${workspaceId}`,
      isActive: pathname === `/${workspaceId}`,
      onClick: () => handleNavClick('navigate'),
    },
    {
      icon: FileText,
      label: 'Drafts',
      href: `/${workspaceId}/drafts`,
      isActive: pathname === `/${workspaceId}/drafts`,
      onClick: () => handleNavClick('navigate'),
    },
    {
      icon: Bell,
      label: 'Activity',
      isActive: isNotificationsPanelOpen,
      onClick: () => handleNavClick('activity'),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden">
      <div className="flex h-14">
        {navItems.map((item) => {
          const Icon = item.icon;
          const className = cn(
            'flex-1 flex flex-col items-center justify-center gap-0.5 text-muted-foreground transition-colors',
            item.isActive && 'text-foreground',
          );

          if (!item.href) {
            return (
              <button key={item.label} onClick={item.onClick} className={className}>
                <Icon className="h-5 w-5" />
                <span className="text-[10px]">{item.label}</span>
              </button>
            );
          }

          return (
            <Link key={item.label} href={item.href} onClick={item.onClick} className={className}>
              <Icon className="h-5 w-5" />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
