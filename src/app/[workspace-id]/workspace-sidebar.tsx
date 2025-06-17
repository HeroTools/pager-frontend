import {
  AlertTriangle,
  HashIcon,
  Loader,
  MessageSquareText,
  SendHorizonal,
} from "lucide-react";

import { InDevelopmentHint } from "@/components/in-development-hint";
import { useGetChannels } from "@/features/channels/hooks/use-channels-mutations";
import { useCreateChannelModal } from "@/features/channels/store/use-create-channel-modal";
import { useGetMembers } from "@/features/members/hooks/use-members";
import { useGetWorkspace } from "@/features/workspaces/hooks/use-workspaces";
import { useParamIds } from "@/hooks/use-param-ids";
import { useMemberId } from "@/hooks/use-member-id";
import { SidebarItem } from "./sidebar-item";
import { UserItem } from "./user-item";
import { WorkspaceHeader } from "./workspace-header";
import { WorkspaceSection } from "./workspace-section";

export const WorkspaceSidebar = () => {
  const { id: channelId, workspaceId } = useParamIds();
  const memberId = useMemberId();

  const getWorkspace = useGetWorkspace(workspaceId);
  const getChannels = useGetChannels(workspaceId);
  const getMembers = useGetMembers(workspaceId);

  const setOpen = useCreateChannelModal((state) => state.setOpen);

  if (getWorkspace.isLoading) {
    return (
      <div className="flex flex-col bg-[#5E2C5F] h-full items-center justify-center">
        <Loader className="size-5 text-white animate-spin" />
      </div>
    );
  }

  if (!getWorkspace.data) {
    return (
      <div className="flex flex-col gap-y-2 bg-[#5E2C5F] h-full items-center justify-center">
        <AlertTriangle className="size-5 text-white" />
        <p className="text-white text-sm">Workspace not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-y-2 bg-[#5E2C5F] h-full">
      <WorkspaceHeader
        workspace={getWorkspace.data}
        isAdmin={getWorkspace.data.role === "admin"}
      />
      <div className="flex flex-col px-2 mt-3">
        {/* TODO: Implement threads and Drafts & Sent features */}
        <InDevelopmentHint>
          <SidebarItem
            label="Threads"
            icon={MessageSquareText}
            id="threads"
            disabled
          />
        </InDevelopmentHint>
        <InDevelopmentHint>
          <SidebarItem
            label="Drafts & Sent"
            icon={SendHorizonal}
            id="drafts"
            disabled
          />
        </InDevelopmentHint>
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
            variant={memberId === item.id ? "active" : "default"}
          />
        ))}
      </WorkspaceSection>
    </div>
  );
};
