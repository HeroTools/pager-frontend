'use client';

import { Bell, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { MobileBottomNav } from '@/components/mobile/mobile-bottom-nav';
import { ProfilePanel } from '@/components/profile-panel';
import { NotificationsSidebar } from '@/components/side-nav/notifications-sidebar';
import { Sidebar } from '@/components/side-nav/sidebar';
import { WorkspaceSidebar } from '@/components/side-nav/workspace-sidebar';
import { Toolbar } from '@/components/toolbar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useCurrentUser } from '@/features/auth';
import { Thread } from '@/features/messages/component/thread';
import { useNotificationPermissions } from '@/features/notifications/hooks/use-notification-permissions';
import { useRealtimeNotifications } from '@/features/notifications/hooks/use-realtime-notifications';
import { usePresence } from '@/hooks/use-presence';
import { useWorkspaceId } from '@/hooks/use-workspace-id';
import { useUIStore } from '@/stores/ui-store';

interface WorkspaceIdClientLayoutProps {
  children: ReactNode;
}

export const WorkspaceIdClientLayout = ({ children }: WorkspaceIdClientLayoutProps) => {
  const {
    setThreadOpen,
    isThreadOpen,
    openThreadMessageId,
    isNotificationsPanelOpen,
    setNotificationsPanelOpen,
    isProfilePanelOpen,
    profileMemberId,
  } = useUIStore();

  const workspaceId = useWorkspaceId();
  const { user, isLoading: isUserLoading } = useCurrentUser(workspaceId);
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);
  const pathname = usePathname();

  useRealtimeNotifications({
    workspaceMemberId: user?.workspace_member_id || '',
    workspaceId: workspaceId || '',
    enabled: !!user?.workspace_member_id && !!workspaceId,
  });

  usePresence({
    workspaceId: workspaceId || '',
    userId: user?.id || '',
    workspaceMemberId: user?.workspace_member_id || '',
    enabled: !isUserLoading && !!user?.id && !!user?.workspace_member_id && !!workspaceId,
  });

  const { permission, requestPermission, isSupported, hasAskedBefore, setHasAskedBefore } =
    useNotificationPermissions();

  useEffect(() => {
    // Show banner immediately when:
    // 1. Notifications are supported
    // 2. We have a user (notifications will start)
    // 3. Permission is still default (not granted/denied)
    // 4. We haven't asked before in this session
    if (isSupported && user?.workspace_member_id && permission === 'default' && !hasAskedBefore) {
      setShowPermissionBanner(true);
    } else {
      setShowPermissionBanner(false);
    }
  }, [isSupported, user?.workspace_member_id, permission, hasAskedBefore]);

  const handleEnableNotifications = async () => {
    const result = await requestPermission();
    setShowPermissionBanner(false);

    if (result === 'granted') {
      // You could show a success toast here
      toast.success('Notifications enabled!');
    } else if (result === 'denied') {
      // Ensure we don't show the banner again even if denied
      localStorage.setItem('notification_permission_asked', 'true');
      setHasAskedBefore(true);
    }
  };

  const handleDismissBanner = () => {
    setShowPermissionBanner(false);
    localStorage.setItem('notification_permission_asked', 'true');
    setHasAskedBefore(true);
  };

  const handleCloseNotifications = () => {
    setNotificationsPanelOpen(false);
  };

  // Check if we're in a channel, DM, or agent conversation
  const isInConversation =
    pathname &&
    (pathname.includes('/c-') || pathname.includes('/d-') || pathname.includes('/agents'));
  return (
    <div className="h-full">
      {/* Desktop Toolbar */}
      <div className="hidden md:block">
        <Toolbar />
      </div>

      {/* Notification Permission Banner */}
      {showPermissionBanner && (
        <div className="relative md:mt-0 mt-12">
          <Alert className="rounded-none border-x-0 border-t-0">
            <Bell className="h-4 w-4" />
            <AlertTitle className="text-sm md:text-base">
              <span className="hidden md:inline">Enable Desktop Notifications</span>
              <span className="md:hidden">Enable Notifications</span>
            </AlertTitle>
            <AlertDescription className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <span className="text-xs md:text-sm">
                <span className="hidden md:inline">
                  Get notified when you receive messages while away from the app
                </span>
                <span className="md:hidden">Get notified when you receive messages</span>
              </span>
              <div className="flex gap-2 md:items-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDismissBanner}
                  className="flex-1 md:flex-initial"
                >
                  Not now
                </Button>
                <Button
                  size="sm"
                  onClick={handleEnableNotifications}
                  className="flex-1 md:flex-initial"
                >
                  <span className="hidden md:inline">Enable notifications</span>
                  <span className="md:hidden">Enable</span>
                </Button>
              </div>
            </AlertDescription>
            <button
              onClick={handleDismissBanner}
              className="absolute right-2 top-2 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hidden md:block"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </Alert>
        </div>
      )}

      {/* Desktop Layout */}
      <div className="hidden md:flex h-[calc(100vh-40px)]">
        <Sidebar />
        <ResizablePanelGroup direction="horizontal" autoSaveId="wck-workspace-layout">
          <ResizablePanel defaultSize={26} minSize={11}>
            {isNotificationsPanelOpen && workspaceId ? (
              <NotificationsSidebar workspaceId={workspaceId} onClose={handleCloseNotifications} />
            ) : (
              <WorkspaceSidebar />
            )}
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={74} minSize={20}>
            {children}
          </ResizablePanel>
          {isThreadOpen() && openThreadMessageId && (
            <>
              <ResizableHandle />
              <ResizablePanel minSize={20} defaultSize={29}>
                <Thread onClose={() => setThreadOpen(null)} />
              </ResizablePanel>
            </>
          )}
          {isProfilePanelOpen() && profileMemberId && (
            <>
              <ResizableHandle />
              <ResizablePanel defaultSize={25} minSize={20}>
                <ProfilePanel />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden flex flex-col h-full">
        {/* Main content area with padding for fixed header and nav */}
        <main className={`flex-1 overflow-hidden ${isInConversation ? '' : 'pb-14'}`}>
          {children}
        </main>

        {/* Thread panel slides in from right on mobile */}
        {isThreadOpen() && openThreadMessageId && (
          <div
            className={`fixed top-0 right-0 w-full z-40 bg-background border-l ${
              isInConversation ? 'bottom-0' : 'bottom-14'
            }`}
          >
            <div className="h-full">
              <Thread onClose={() => setThreadOpen(null)} />
            </div>
          </div>
        )}

        {/* Profile panel as full-screen overlay on mobile */}
        {isProfilePanelOpen() && profileMemberId && (
          <div className="fixed inset-0 z-50 bg-background">
            <div className="h-full">
              <ProfilePanel />
            </div>
          </div>
        )}

        {/* Notifications as full-screen overlay on mobile */}
        {isNotificationsPanelOpen && workspaceId && (
          <div className="fixed inset-0 z-50 bg-background">
            <div className="h-full">
              <NotificationsSidebar workspaceId={workspaceId} onClose={handleCloseNotifications} />
            </div>
          </div>
        )}

        {!isInConversation && <MobileBottomNav />}
      </div>
    </div>
  );
};

export default WorkspaceIdClientLayout;
