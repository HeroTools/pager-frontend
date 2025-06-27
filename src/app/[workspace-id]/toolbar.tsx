"use client";

import { Info, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { InDevelopmentHint } from "@/components/in-development-hint";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useGetAllAvailableChannels } from "@/features/channels/hooks/use-channels-mutations";
import { useGetMembers } from "@/features/members/hooks/use-members";
import { useGetWorkspace } from "@/features/workspaces/hooks/use-workspaces";
import { useWorkspaceId } from "@/hooks/use-workspace-id";

export const Toolbar = () => {
  const router = useRouter();
  const workspaceId = useWorkspaceId() as string;

  const { data: workspace } = useGetWorkspace(workspaceId);
  const getChannels = useGetAllAvailableChannels(workspaceId);
  const getMembers = useGetMembers(workspaceId);

  const [open, setOpen] = useState(false);

  const handleChannelClick = (channelId: string) => () => {
    setOpen(false);
    router.push(`/${workspaceId}/c-${channelId}`);
  };

  const handleMemberClick = (memberId: string) => () => {
    setOpen(false);
    router.push(`/${workspaceId}/d-${memberId}`);
  };

  return (
    <div className="flex items-center justify-between h-10 p-1.5 border-b border-border-subtle">
      <div className="flex-1"></div>
      <div className="min-w-[280px] max-[642px] grow-2 shrink">
        <Button
          size="sm"
          className="border hover:bg-accent-25 w-full justify-start h-7 px-2 bg-background"
          onClick={() => setOpen(true)}
        >
          <Search className="size-4 text-muted-foreground mr-2" />
          <span className="text-muted-foreground text-xs">
            Search {workspace?.name}
          </span>
        </Button>
        <CommandDialog open={open} onOpenChange={setOpen}>
          <CommandInput placeholder="Type a command or search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Channels">
              {getChannels.data?.map((channel) => (
                <CommandItem
                  key={channel.id}
                  onSelect={handleChannelClick(channel.id)}
                >
                  {channel.name}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Members">
              {getMembers.data?.map((member) => (
                <CommandItem
                  key={member.id}
                  onSelect={handleMemberClick(member.id)}
                >
                  {member.user.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      </div>
    </div>
  );
};
