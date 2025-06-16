import {
  AlertTriangle,
  HashIcon,
  Loader,
  MessageSquareText,
  SendHorizonal,
} from "lucide-react";

import { InDevelopmentHint } from "@/components/InDevelopmentHint";
import { useGetChannels } from "@/features/channels/api/useGetChannels";
import { useCreateChannelModal } from "@/features/channels/store/useCreateChannelModal";
import { useCurrentMember } from "@/features/members/api/useCurrentMember";
import { useGetMembers } from "@/features/members/api/useGetMembers";
import { useGetWorkspace } from "@/features/workspaces/api/useGetWorkspace";
import { useChannelId } from "@/hooks/useChannelId";
import { useMemberId } from "@/hooks/useMemberId";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { SidebarItem } from "./SidebarItem";
import { UserItem } from "./UserItem";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { WorkspaceSection } from "./WorkspaceSection";

export const WorkspaceSidebar = () => {
  const workspaceId = useWorkspaceId();
  const channelId = useChannelId();
  const memberId = useMemberId();

  const currentMember = useCurrentMember({
    workspaceId,
  });
  const getWorkspace = useGetWorkspace({
    id: workspaceId,
  });
  const getChannels = useGetChannels({ workspaceId });
  const getMembers = useGetMembers({ workspaceId });

  const setOpen = useCreateChannelModal((state) => state.setOpen);

  if (currentMember.isLoading || getWorkspace.isLoading) {
    return (
      <div className="flex flex-col bg-[#5E2C5F] h-full items-center justify-center">
        <Loader className="size-5 text-white animate-spin" />
      </div>
    );
  }

  if (!getWorkspace.data || !currentMember.data) {
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
        isAdmin={currentMember.data.role === "admin"}
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
        onNew={currentMember.data.role === "admin" ? () => setOpen(true) : undefined}
      >
        {getChannels.data?.map((item) => (
          <SidebarItem
            key={item._id}
            label={item.name}
            icon={HashIcon}
            id={item._id}
            variant={channelId === item._id ? "active" : "default"}
          />
        ))}
      </WorkspaceSection>
      <WorkspaceSection label="Direct Messages" hint="New direct message">
        {getMembers.data?.map((item) => (
          <UserItem
            id={item._id}
            image={item.user.image}
            key={item._id}
            label={item.user.name}
            variant={memberId === item._id ? "active" : "default"}
          />
        ))}
      </WorkspaceSection>
    </div>
  );
};
