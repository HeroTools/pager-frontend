import React, { useState } from "react";
import { Hash, Lock, Users, Star, Info, MoreVertical, Settings, LogOut } from "lucide-react";
import { Channel } from "@/types/chat";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ChannelDetailsModal } from "./channel-details-modal";

interface ChatHeaderProps {
  channel: Channel;
  onToggleDetails?: () => void;
  members?: { id: string; name: string; avatar?: string }[];
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  channel,
  onToggleDetails,
  members = [],
}) => {
  const [isDetailsModalOpen, setDetailsModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<"members" | "settings">("members");
  // Show up to 4 avatars, then a +N indicator
  const maxAvatars = 4;
  const visibleMembers = members.slice(0, maxAvatars);
  const extraCount = members.length - maxAvatars;

  const openModal = (tab: "members" | "settings" = "members") => {
    setModalInitialTab(tab);
    setDetailsModalOpen(true);
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
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground"
        >
          <Star className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-3">
        {/* Member Avatars - click to open channel details */}
        <Button 
          onClick={() => openModal("members")}
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
              openModal("settings");
            }}>
              <Settings className="w-4 h-4 mr-2" />
               Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Leave channel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* Member count and info button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleDetails}
          className="h-8 w-8 p-0"
        >
          <Info className="w-4 h-4 text-muted-foreground" />
        </Button>
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
