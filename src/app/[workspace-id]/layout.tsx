"use client";

import { Loader } from "lucide-react";
import { ReactNode } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Profile } from "@/features/members/components/profile";
import { Thread } from "@/features/messages/component/thread";
import { usePanel } from "@/hooks/use-panel";
import { Sidebar } from "@/components/side-nav/sidebar";
import { Toolbar } from "./toolbar";
import { WorkspaceSidebar } from "@/components/side-nav/workspace-sidebar";
import { Id } from "@/types";
import { useUIStore } from "@/store/ui-store";

interface WorkspaceIdLayoutProps {
  children: ReactNode;
}

const WorkspaceIdLayout = ({ children }: WorkspaceIdLayoutProps) => {
  const { setThreadOpen, isThreadOpen, openThreadMessageId } = useUIStore();

  return (
    <div className="h-full">
      <Toolbar />
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
                <Thread
                  messageId={openThreadMessageId}
                  onClose={() => setThreadOpen(null)}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default WorkspaceIdLayout;
