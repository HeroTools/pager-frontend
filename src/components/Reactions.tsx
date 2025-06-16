import { MdOutlineAddReaction } from "react-icons/md";

import { useCurrentMember } from "@/features/members/api/useCurrentMember";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { cn } from "@/lib/utils";
import { EmojiPopover } from "./EmojiPopover";
import { Hint } from "./Hint";
import { useToggleReaction } from "@/features/reactions/api/useToggleReaction";

interface ReactionsProps {
  messageId: string;
  data: Array<{
    id: string;
    emoji: string;
    count: number;
    memberIds: string[];
  }>;
}

export const Reactions = ({ messageId, data }: ReactionsProps) => {
  const workspaceId = useWorkspaceId();
  const currentMember = useCurrentMember({ workspaceId });
  const { mutateAsync: toggleReaction } = useToggleReaction(messageId);

  if (data.length === 0 || !currentMember.data?.id) {
    return null;
  }

  const handleReaction = async (emoji: string) => {
    try {
      await toggleReaction({ emoji });
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
    }
  };

  return (
    <div className="flex items-center gap-1 mt-1 mb-1">
      {data.map((reaction) => (
        <Hint
          key={reaction.id}
          label={`${reaction.count} ${reaction.count === 1 ? "person" : "people"} reacted with ${reaction.emoji}`}
        >
          <button
            className={cn(
              "h-6 px-2 rounded-full bg-slate-200/70 border border-transparent text-slate-800 flex items-center gap-x-1",
              currentMember.data &&
                reaction.memberIds.includes(currentMember.data.id) &&
                "bg-blue-100/70 border-blue-500 text-blue-500"
            )}
            onClick={() => handleReaction(reaction.emoji)}
          >
            {reaction.emoji}
            <span
              className={cn(
                "text-xs text-muted-foreground font-semibold",
                currentMember.data &&
                  reaction.memberIds.includes(currentMember.data.id) &&
                  "text-blue-500"
              )}
            >
              {reaction.count}
            </span>
          </button>
        </Hint>
      ))}
      <EmojiPopover
        hint="Add reaction"
        onEmojiSelect={(emoji) => handleReaction(emoji)}
      >
        <button className="h-7 px-3 rounded-full bg-slate-200/70 border border-transparent text-slate-800 hover:border-slate-500 flex items-center gap-x-1">
          <MdOutlineAddReaction />
        </button>
      </EmojiPopover>
    </div>
  );
};
