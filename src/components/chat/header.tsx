import React, { useState } from "react";
import { Hash, Lock, Users, MoreVertical, Settings, LogOut } from "lucide-react";
import { Channel } from "@/types/chat";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ChannelDetailsModal } from "./channel-details-modal";
import { ChannelMemberData } from "@/features/channels/types";
import { useRemoveChannelMembers } from "@/features/channels";
import { useCurrentUser } from "@/features/auth";
import { useGetMembers } from "@/features/members";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ChatHeaderProps {
  channel: Channel;
  onToggleDetails?: () => void;
  members?: ChannelMemberData[];
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  channel,
  onToggleDetails,
  members = [],
}) => {
  const [isDetailsModalOpen, setDetailsModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<"members" | "settings">("members");
  const removeChannelMembers = useRemoveChannelMembers();
  const { user } = useCurrentUser();
  const workspaceId = useWorkspaceId() as string;
  const { data: workspaceMembers = [] } = useGetMembers(workspaceId);
  const router = useRouter();
  
  // Show up to 4 avatars, then a +N indicator
  const maxAvatars = 4;
  const visibleMembers = members.slice(0, maxAvatars);
  const extraCount = members.length - maxAvatars;

  const openModal = (tab: "members" | "settings" = "members") => {
    setModalInitialTab(tab);
    setDetailsModalOpen(true);
  };

  const handleLeaveChannel = async () => {
    if (!user) {
      toast.error("User not found");
      return;
    }

    // First find the workspace member for the current user
    const currentWorkspaceMember = workspaceMembers.find(wm => 
      wm.user.id === user.id
    );

    if (!currentWorkspaceMember) {
      toast.error("Unable to leave channel - workspace membership not found");
      return;
    }

    // Then find the channel member using the workspace member ID
    const currentChannelMember = members.find(member => 
      member.workspace_member_id === currentWorkspaceMember.id
    );

    if (!currentChannelMember) {
      toast.error("Unable to leave channel - channel membership not found");
      return;
    }

    try {
      await removeChannelMembers.mutateAsync({
        workspaceId,
        channelId: channel.id,
        channelMemberIds: [currentChannelMember.id],
      });
      
      toast.success("Left channel successfully");
      // Navigate away from the channel
      router.push(`/${workspaceId}`);
    } catch (error) {
      console.error("Failed to leave channel:", error);
      toast.error("Failed to leave channel");
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
      <div className="flex items-center gap-2">
        {channel.isPrivate ? (
          <Lock className="w-4 h-4 text-muted-foreground" />
        ) : (
          <Hash className="w-4 h-4 text-muted-foreground" />
        )}
        <h2 className="font-semibold text-lg text-foreground">
          {channel.name}
        </h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Member Avatars - click to open channel details */}
        <Button 
          onClick={() => {
            setModalInitialTab("members");
            setDetailsModalOpen(true);
          }}
          variant="ghost"
          className="flex items-center -space-x-2 focus:outline-none group relative px-2 py-1 rounded-md hover:bg-muted/50 transition-colors"
          title="Channel details"
        >
          <TooltipProvider>
            {visibleMembers.map((member) => (
              <Tooltip key={member.id}>
                <TooltipTrigger asChild>
                  <Avatar className="h-7 w-7 border-2 border-background bg-muted">
                    {member.avatar ? (
                      <AvatarImage src={member.avatar} alt={member.name} />
                    ) : (
                      <AvatarFallback>{member.name?.[0] || <Users className="w-4 h-4" />}</AvatarFallback>
                    )}
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>{member.name}</TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
          {extraCount > 0 && (
            <div className="h-7 w-7 flex items-center justify-center rounded-full bg-muted text-xs font-medium border-2 border-background text-muted-foreground">
              +{extraCount}
            </div>
          )}
        </Button>
        {/* Kebab Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="iconSm" className="h-8 w-8 p-0">
              <MoreVertical className="w-5 h-5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => {
              setModalInitialTab("settings");
              setDetailsModalOpen(true);
            }}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive"
              onClick={handleLeaveChannel}
              disabled={removeChannelMembers.isPending}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {removeChannelMembers.isPending ? "Leaving..." : "Leave channel"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <ChannelDetailsModal 
        isOpen={isDetailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        channel={channel}
        members={members}
        initialTab={modalInitialTab}
      />
    </div>
  );
};
