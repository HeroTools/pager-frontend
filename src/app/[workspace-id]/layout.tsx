'use client';

import { Bell, X } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';

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
import { useWorkspaceId } from '@/hooks/use-workspace-id';
import { useUIStore } from '@/store/ui-store';

interface WorkspaceIdLayoutProps {
  children: ReactNode;
}

const WorkspaceIdLayout = ({ children }: WorkspaceIdLayoutProps) => {
  const {
    setThreadOpen,
    isThreadOpen,
    openThreadMessageId,
    isNotificationsPanelOpen,
    setNotificationsPanelOpen,
    isProfilePanelOpen,
    profileMemberId,
    setProfilePanelOpen,
  } = useUIStore();

  const workspaceId = useWorkspaceId();
  const { user } = useCurrentUser(workspaceId);
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);

  useRealtimeNotifications({
    workspaceMemberId: user?.workspace_member_id || '',
    workspaceId: workspaceId || '',
    enabled: !!user?.workspace_member_id && !!workspaceId,
  });

  const { permission, requestPermission, isSupported, hasAskedBefore, setHasAskedBefore } =
    useNotificationPermissions();

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;

    // Show permission banner if:
    // 1. Notifications are supported
    // 2. Permission is "default" (not yet asked)
    // 3. We haven't asked before in this session
    // 4. User is logged in
    if (isSupported && permission === 'default' && !hasAskedBefore && user?.workspace_member_id) {
      // Show banner after a short delay to not overwhelm the user
      timer = setTimeout(() => {
        setShowPermissionBanner(true);
      }, 5000);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [isSupported, permission, hasAskedBefore, user]);

  const handleEnableNotifications = async () => {
    const result = await requestPermission();
    setShowPermissionBanner(false);

    if (result === 'granted') {
      // You could show a success toast here
      console.log('Browser notifications enabled!');
    }
  };

  const handleDismissBanner = () => {
    setShowPermissionBanner(false);
    setHasAskedBefore(true);
  };

  const handleCloseNotifications = () => {
    setNotificationsPanelOpen(false);
  };

  return (
    <div className="h-full">
      <Toolbar />

      {/* Notification Permission Banner */}
      {showPermissionBanner && (
        <div className="relative">
          <Alert className="rounded-none border-x-0 border-t-0">
            <Bell className="h-4 w-4" />
            <AlertTitle>Enable Desktop Notifications</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>Get notified when you receive messages while away from the app</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleDismissBanner}>
                  Not now
                </Button>
                <Button size="sm" onClick={handleEnableNotifications}>
                  Enable notifications
                </Button>
              </div>
            </AlertDescription>
            <button
              onClick={handleDismissBanner}
              className="absolute right-2 top-2 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </Alert>
        </div>
      )}

      <div className="flex h-[calc(100vh-40px)]">
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
              <ResizablePanel minSize={20} defaultSize={25}>
                <ProfilePanel />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default WorkspaceIdLayout;
