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
import { useParamIds } from "@/hooks/use-param-ids";
import { SidebarItem } from "./sidebar-item";
import { UserItem } from "./user-item";
import { WorkspaceHeader } from "./workspace-header";
import { WorkspaceSection } from "./workspace-section";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export const WorkspaceSidebar = () => {
  const { workspaceId, id: entityId } = useParamIds();

  const getWorkspace = useGetWorkspace(workspaceId);
  const getChannels = useGetChannels(workspaceId);
  const getMembers = useGetMembers(workspaceId);

  const setOpen = useCreateChannelModal((state) => state.setOpen);
  const router = useRouter();

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
          getWorkspace.data?.user_role === "admin" ? () => setOpen(true) : undefined
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
        <div className="pt-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="w-full" variant="outline">+ Add Channel</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setOpen(true)}>
                Create a new channel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/${workspaceId}/browse-channels`)}>
                Browse channels
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </WorkspaceSection>
      <WorkspaceSection label="Direct Messages" hint="New direct message">
        {getMembers.data?.map((item) => (
          <UserItem
            id={item.id}
            image={item.user.image}
            key={item.id}
            label={item.user.name}
            variant={entityId === item.id ? "active" : "default"}
          />
        ))}
      </WorkspaceSection>
    </div>
  );
};
