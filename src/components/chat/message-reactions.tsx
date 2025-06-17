import React from "react";
import { Reaction } from "@/types/chat";
import { cn } from "@/lib/utils";

interface MessageReactionsProps {
  reactions: Reaction[];
  currentUserId: string;
  onReaction: (emoji: string) => void;
}

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  reactions,
  currentUserId,
  onReaction,
}) => {
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {reactions.map((reaction) => {
        const hasReacted = reaction.users.includes(currentUserId);

        return (
          <button
            key={reaction.emoji}
            onClick={() => onReaction(reaction.emoji)}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors",
              hasReacted
                ? "bg-blue-100 text-blue-800 border border-blue-200"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
            )}
          >
            <span>{reaction.emoji}</span>
            <span>{reaction.count}</span>
          </button>
        );
      })}
    </div>
  );
};
