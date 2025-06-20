import React from "react";
import { Hash, Lock, Users, Star, Info, MoreVertical } from "lucide-react";
import { Channel } from "@/types/chat";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

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
  // Show up to 4 avatars, then a +N indicator
  const maxAvatars = 4;
  const visibleMembers = members.slice(0, maxAvatars);
  const extraCount = members.length - maxAvatars;

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
        {/* Member Avatars */}
        <div className="flex items-center -space-x-2">
          <TooltipProvider>
            {visibleMembers.map((member) => (
              <Tooltip key={member.id}>
                <TooltipTrigger asChild>
                  <Avatar className="h-7 w-7 border-2 border-background bg-muted">
                    {member.avatar ? (
                      <AvatarImage src={member.avatar} alt={member.name} />
                    ) : (
                      <AvatarFallback>{member.name[0]}</AvatarFallback>
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
        </div>
        {/* Kebab Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="iconSm" className="h-8 w-8 p-0">
              <MoreVertical className="w-5 h-5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Channel Settings</DropdownMenuItem>
            <DropdownMenuItem>Manage Members</DropdownMenuItem>
            <DropdownMenuItem>Leave Channel</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* Member count and info button */}
        {channel.memberCount && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{channel.memberCount}</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleDetails}
          className="h-8 w-8 p-0"
        >
          <Info className="w-4 h-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
};
