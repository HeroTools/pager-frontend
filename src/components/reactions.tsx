import { MdOutlineAddReaction } from "react-icons/md";

import { useCurrentMember } from "@/features/members/hooks/use-members";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { cn } from "@/lib/utils";
import { EmojiPopover } from "./emoji-popover";
import { Hint } from "./hint";
import { useToggleReaction } from "@/features/reactions";

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
  const currentMember = useCurrentMember(workspaceId);
  const { mutateAsync: toggleReaction } = useToggleReaction(messageId);

  if (data.length === 0 || !currentMember.data?.id) {
    return null;
  }

  const handleReaction = async (emoji: string) => {
    try {
      await toggleReaction({ emoji });
    } catch (error) {
      console.error("Failed to toggle reaction:", error);
    }
  };

  return (
    <div className="flex items-center gap-1 mt-1 mb-1">
      {data.map((reaction) => (
        <Hint
          key={reaction.id}
          label={`${reaction.count} ${
            reaction.count === 1 ? "person" : "people"
          } reacted with ${reaction.emoji}`}
        >
          <button
            className={cn(
              "h-6 px-2 rounded-full bg-secondary border border-transparent text-secondary-foreground flex items-center gap-x-1",
              currentMember.data &&
                reaction.memberIds.includes(currentMember.data.id) &&
                "bg-accent border-subtle text-accent-foreground"
            )}
            onClick={() => handleReaction(reaction.emoji)}
          >
            {reaction.emoji}
            <span
              className={cn(
                "text-xs text-muted-foreground font-semibold",
                currentMember.data &&
                  reaction.memberIds.includes(currentMember.data.id) &&
                  "text-accent"
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
        <button className="h-7 px-3 rounded-full bg-accent border border-transparent text-accent-foreground hover:border-accent flex items-center gap-x-1">
          <MdOutlineAddReaction />
        </button>
      </EmojiPopover>
    </div>
  );
};
