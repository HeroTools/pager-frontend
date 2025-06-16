"use client";

import { Info, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { InDevelopmentHint } from "@/components/InDevelopmentHint";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useGetChannels } from "@/features/channels/api/useChannels";
import { useGetMembers } from "@/features/members/api/useMembers";
import { useGetWorkspace } from "@/features/workspaces/api/useWorkspaces";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";

export const Toolbar = () => {
  const router = useRouter();
  const workspaceId = useWorkspaceId() as string;

  const { data: workspace } = useGetWorkspace(workspaceId);
  const getChannels = useGetChannels(workspaceId);
  const getMembers = useGetMembers(workspaceId);

  const [open, setOpen] = useState(false);

  const handleChannelClick = (channelId: string) => () => {
    setOpen(false);
    router.push(`/workspace/${workspaceId}/channel/${channelId}`);
  };

  const handleMemberClick = (memberId: string) => () => {
    setOpen(false);
    router.push(`/workspace/${workspaceId}/member/${memberId}`);
  };

  return (
    <div className="bg-[#481349] flex items-center justify-between h-10 p-1.5">
      <div className="flex-1"></div>
      <div className="min-w-[280px] max-[642px] grow-2 shrink">
        <Button
          size="sm"
          className="bg-accent/25 hover:bg-accent-25 w-full justify-start h-7 px-2"
          onClick={() => setOpen(true)}
        >
          <Search className="size-4 text-white mr-2" />
          <span className="text-white text-xs">Search {workspace?.name}</span>
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
      <div className="ml-auto flex-1 flex items-center justify-end">
        {/* TODO: Implement info button */}
        <InDevelopmentHint>
          <Button variant="transparent" size="iconSm" disabled>
            <Info className="size-5 text-white" />
          </Button>
        </InDevelopmentHint>
      </div>
    </div>
  );
};
