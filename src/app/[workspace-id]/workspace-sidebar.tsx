import {
  AlertTriangle,
  HashIcon,
  Loader,
  MessageSquareText,
  SendHorizonal,
} from "lucide-react";

import { useGetChannels } from "@/features/channels/hooks/use-channels-mutations";
import { useCreateChannelModal } from "@/features/channels/store/use-create-channel-modal";
import { useGetMembers } from "@/features/members/hooks/use-members";
import { useGetWorkspace } from "@/features/workspaces/hooks/use-workspaces";
import { useChannelId } from "@/hooks/use-channel-id";
import { useMemberId } from "@/hooks/use-member-id";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { SidebarItem } from "./sidebar-item";
import { UserItem } from "./user-item";
import { WorkspaceHeader } from "./workspace-header";
import { WorkspaceSection } from "./workspace-section";

export const WorkspaceSidebar = () => {
  const workspaceId = useWorkspaceId();
  const channelId = useChannelId();
  const memberId = useMemberId();

  const getWorkspace = useGetWorkspace(workspaceId);
  const getChannels = useGetChannels(workspaceId);
  const getMembers = useGetMembers(workspaceId);

  const setOpen = useCreateChannelModal((state) => state.setOpen);

  if (getWorkspace.isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader className="size-5 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (!getWorkspace.data) {
    return (
      <div className="flex flex-col gap-y-2 h-full items-center justify-center">
        <AlertTriangle className="size-5 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">Workspace not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-y-2 h-full">
      <WorkspaceHeader
        workspace={getWorkspace.data}
        isAdmin={getWorkspace.data.role === "admin"}
      />
      <div className="flex flex-col px-2 mt-3">
        {/* TODO: Implement threads and Drafts & Sent features */}
        
          <SidebarItem
            label="Threads"
            icon={MessageSquareText}
            id="threads"
            disabled
          />
          <SidebarItem
            label="Drafts & Sent"
            icon={SendHorizonal}
            id="drafts"
            disabled
          />
      </div>
      <WorkspaceSection
        label="Channels"
        hint="New channel"
        onNew={
          getWorkspace.data.role === "admin" ? () => setOpen(true) : undefined
        }
      >
        {getChannels.data?.map((item) => (
          <SidebarItem
            key={item.id}
            label={item.name}
            icon={HashIcon}
            id={item.id}
            variant={channelId === item.id ? "active" : "default"}
          />
        ))}
      </WorkspaceSection>
      <WorkspaceSection label="Direct Messages" hint="New direct message">
        {getMembers.data?.map((item) => (
          <UserItem
            id={item.id}
            image={item.user.image}
            key={item.id}
            label={item.user.name}
            variant={memberId === item._id ? "active" : "default"}
          />
        ))}
      </WorkspaceSection>
    </div>
  );
};
