import React from "react";
import { Hash, Lock, Users, Star, Info } from "lucide-react";
import { Channel } from "@/types/chat";
import { Button } from "@/components/ui/button";

interface ChatHeaderProps {
  channel: Channel;
  onToggleDetails?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  channel,
  onToggleDetails,
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-muted-foreground">
      <div className="flex items-center gap-2">
        {channel.isPrivate ? (
          <Lock className="w-4 h-4 text-muted-foreground" />
        ) : (
          <Hash className="w-4 h-4 text-muted-foreground" />
        )}
        <h2 className="font-semibold text-lg text-foreground">{channel.name}</h2>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground">
          <Star className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {channel.memberCount && (
          <div className="flex items-center gap-1 text-sm text-gray-600">
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
          <Info className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
