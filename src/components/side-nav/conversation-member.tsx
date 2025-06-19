import { cva, VariantProps } from "class-variance-authority";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { cn } from "@/lib/utils";

const conversationItemVariants = cva(
  "flex items-center gap-1.5 justify-start font-normal h-7 px-4 text-sm overflow-hidden",
  {
    variants: {
      variant: {
        default: "text-secondary-foreground hover:bg-secondary/50",
        active:
          "text-secondary-foreground bg-secondary/90 hover:bg-secondary/90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface ConversationMember {
  id: string;
  joined_at: string;
  left_at: string | null;
  is_hidden: boolean;
  workspace_member: {
    id: string;
    role: string;
    user: {
      id: string;
      name: string;
      image: string | null;
    };
  };
}

interface Conversation {
  id: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
  members: ConversationMember[];
  member_count: number;
  other_members: ConversationMember[];
  is_group_conversation: boolean;
}

interface ConversationItemProps {
  conversation: Conversation;
  variant?: VariantProps<typeof conversationItemVariants>["variant"];
}

const getConversationDisplay = (conversation: Conversation) => {
  if (conversation.is_group_conversation) {
    // For group conversations, show all member names (truncated if too long)
    const names = conversation.members.map(
      (member) => member.workspace_member.user.name
    );
    const displayName = names.join(", ");

    // If the name is too long, show first few names + count
    if (displayName.length > 30) {
      const firstTwoNames = names.slice(0, 2).join(", ");
      const remainingCount = names.length - 2;
      return {
        name: `${firstTwoNames}${
          remainingCount > 0 ? `, +${remainingCount} others` : ""
        }`,
        image: null, // We'll show a group icon or first member's image
        initials: names
          .map((name) => name.charAt(0))
          .join("")
          .slice(0, 2),
      };
    }

    return {
      name: displayName,
      image: conversation.members[0]?.workspace_member.user.image || null,
      initials: names
        .map((name) => name.charAt(0))
        .join("")
        .slice(0, 2),
    };
  } else {
    // For 1-on-1 conversations, show the other person
    const otherMember = conversation.other_members[0];
    if (!otherMember) {
      return {
        name: "Unknown User",
        image: null,
        initials: "?",
      };
    }

    return {
      name: otherMember.workspace_member.user.name,
      image: otherMember.workspace_member.user.image,
      initials: otherMember.workspace_member.user.name.charAt(0).toUpperCase(),
    };
  }
};

export const ConversationItem = ({
  conversation,
  variant,
}: ConversationItemProps) => {
  const workspaceId = useWorkspaceId();
  const display = getConversationDisplay(conversation);

  return (
    <Button
      variant="transparent"
      className={cn(conversationItemVariants({ variant }))}
      size="sm"
      asChild
    >
      <Link href={`/${workspaceId}/d-${conversation.id}`}>
        <div className="relative">
          <Avatar className="size-5 rounded-md mr-1">
            <AvatarImage
              className="rounded-md"
              src={display.image || undefined}
            />
            <AvatarFallback className="rounded-md bg-muted text-muted-foreground text-xs">
              {display.initials}
            </AvatarFallback>
          </Avatar>

          {/* Member count badge for group conversations */}
          {conversation.is_group_conversation && (
            <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
              {conversation.member_count}
            </div>
          )}
        </div>

        <span className="text-sm truncate flex-1">{display.name}</span>

        {/* TODO: Add online status indicator */}
        {!conversation.is_group_conversation && (
          <div className="w-2 h-2 bg-green-500 rounded-full ml-auto opacity-60" />
        )}
      </Link>
    </Button>
  );
};
