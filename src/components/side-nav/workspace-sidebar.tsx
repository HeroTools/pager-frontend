import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  HashIcon,
  Loader,
  MessageSquareText,
  SendHorizonal,
} from "lucide-react";

import { useGetUserChannels } from "@/features/channels/hooks/use-channels-mutations";
import { useCreateChannelModal } from "@/features/channels/store/use-create-channel-modal";
import { useConversations } from "@/features/conversations";
import { useGetWorkspace } from "@/features/workspaces/hooks/use-workspaces";
import { useParamIds } from "@/hooks/use-param-ids";
import { SidebarItem } from "./sidebar-item";
import { ConversationItem } from "./conversation-member";
import { WorkspaceHeader } from "./workspace-header";
import { WorkspaceSection } from "./workspace-section";
import { useConversationCreateStore } from "@/features/conversations/store/conversation-create-store";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { InviteModal } from "./invite-modal";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";

export const WorkspaceSidebar = () => {
  const router = useRouter();
  const { workspaceId, id: entityId } = useParamIds();

  const getWorkspace = useGetWorkspace(workspaceId);
  // TODO optimise this to get the channels and conversations from the get workspace query just add include_details=true but update BE first
  const getUserChannels = useGetUserChannels(workspaceId);
  const { conversations } = useConversations(workspaceId);
  const { user: currentUser } = useCurrentUser();

  const { startConversationCreation } = useConversationCreateStore();

  const setOpen = useCreateChannelModal((state) => state.setOpen);

  const [inviteOpen, setInviteOpen] = useState(false);

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
        isAdmin={getWorkspace.data.user_role === "admin"}
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
          getWorkspace.data?.user_role === "admin"
            ? () => setOpen(true)
            : undefined
        }
      >
        {(getUserChannels.data || [])?.map((item) => (
          <SidebarItem
            key={item.id}
            label={item.name}
            icon={HashIcon}
            id={item.id}
            variant={entityId === item.id ? "active" : "default"}
          />
        ))}
        <div className="pt-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="w-full" variant="ghost">
                + Add Channel
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setOpen(true)}>
                Create a new channel
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push(`/${workspaceId}/browse-channels`)}
              >
                Browse channels
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
        {currentUser?.role === "admin" && (
          <>
            <Button
              className="mt-2 w-full"
              variant="ghost"
              onClick={() => setInviteOpen(true)}
            >
              + Invite People
            </Button>
            <InviteModal
              open={inviteOpen}
              setOpen={setInviteOpen}
              name={getWorkspace.data.name}
            />
          </>
        )}
      </WorkspaceSection>
    </div>
  );
};
