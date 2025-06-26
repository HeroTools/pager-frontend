"use client";

import { ReactNode } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Thread } from "@/features/messages/component/thread";
import { Sidebar } from "@/components/side-nav/sidebar";
import { Toolbar } from "./toolbar";
import { WorkspaceSidebar } from "@/components/side-nav/workspace-sidebar";
import { useUIStore } from "@/store/ui-store";
import { useRealtimeNotifications } from "@/features/notifications/hooks/use-realtime-notifications";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { useCurrentUser } from "@/features/auth";
import { NotificationSettings } from "@/features/notifications/components/notification-settings";
import { useNotificationPermissions } from "@/features/notifications/hooks/use-notification-permissions";

interface WorkspaceIdLayoutProps {
  children: ReactNode;
}

const WorkspaceIdLayout = ({ children }: WorkspaceIdLayoutProps) => {
  const { setThreadOpen, isThreadOpen, openThreadMessageId } = useUIStore();
  const workspaceId = useWorkspaceId();
  const { user } = useCurrentUser(workspaceId);

  // Enable real-time notifications for this workspace
  useRealtimeNotifications({
    userId: user?.id || "",
    workspaceId: workspaceId || "",
    enabled: !!user?.id && !!workspaceId,
  });

  const { permission, requestPermission } = useNotificationPermissions();

  const handleEnableNotifications = async () => {
    if (permission === "default") {
      await requestPermission();
    }
  };

  return (
    <div className="h-full">
      <Toolbar />
      {/* <NotificationSettings /> */}
      {permission === "default" && (
        <button onClick={handleEnableNotifications}>
          Enable notifications for the best experience
        </button>
      )}
      <div className="flex h-[calc(100vh-40px)]">
        <Sidebar />
        <ResizablePanelGroup
          direction="horizontal"
          autoSaveId="wck-workspace-layout"
        >
          <ResizablePanel defaultSize={26} minSize={11}>
            <WorkspaceSidebar />
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
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default WorkspaceIdLayout;
