import {
  AlertTriangle,
  HashIcon,
  Loader,
  MessageSquareText,
  SendHorizonal,
} from "lucide-react";

import { useGetChannels } from "@/features/channels/hooks/use-channels-mutations";
import { useCreateChannelModal } from "@/features/channels/store/use-create-channel-modal";
import { useConversations } from "@/features/conversations";
import { useGetWorkspace } from "@/features/workspaces/hooks/use-workspaces";
import { useParamIds } from "@/hooks/use-param-ids";
import { SidebarItem } from "./sidebar-item";
import { ConversationItem } from "./conversation-member";
import { WorkspaceHeader } from "./workspace-header";
import { WorkspaceSection } from "./workspace-section";
import { useConversationCreateStore } from "@/features/conversations/store/conversation-create-store";

export const WorkspaceSidebar = () => {
  const { workspaceId, id: entityId } = useParamIds();

  const getWorkspace = useGetWorkspace(workspaceId);
  // TODO optimise this so that we get channels and conversations in one query (might have to change backend to return both)
  const getChannels = useGetChannels(workspaceId);
  const { conversations } = useConversations(workspaceId);

  const { startConversationCreation } = useConversationCreateStore();

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
            variant={entityId === item.id ? "active" : "default"}
          />
        ))}
      </WorkspaceSection>
      <WorkspaceSection
        label="Direct Messages"
        hint="New direct message"
        onNew={startConversationCreation}
      >
        {conversations?.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            variant={entityId === conversation.id ? "active" : "default"}
          />
        ))}
      </WorkspaceSection>
    </div>
  );
};
