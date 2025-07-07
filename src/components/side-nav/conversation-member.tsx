import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWorkspaceId } from '@/hooks/use-workspace-id';
import { useConversationNotifications } from '@/features/notifications/hooks/use-conversation-notifications';
import { cn } from '@/lib/utils';
import { useMarkEntityNotificationsRead } from '@/features/notifications/hooks/use-mark-entity-notifications-read';

const conversationItemVariants = cva(
  'flex items-center gap-1.5 justify-start font-normal h-7 px-4 text-sm overflow-hidden',
  {
    variants: {
      variant: {
        default: 'text-secondary-foreground hover:bg-secondary/50',
        active: 'text-secondary-foreground bg-secondary/90 hover:bg-secondary/90',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
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
  variant?: VariantProps<typeof conversationItemVariants>['variant'];
  hasUnread?: boolean;
}

const getConversationDisplay = (conversation: Conversation) => {
  if (conversation.is_group_conversation) {
    // For group conversations, show all member names (truncated if too long)
    const names = conversation.members.map((member) => member.workspace_member.user.name);

    return {
      name: names.join(', '),
      image: conversation.members[0]?.workspace_member.user.image || null,
      initials: names
        .map((name) => name.charAt(0))
        .join('')
        .slice(0, 2),
    };
  } else {
    // For 1-on-1 conversations, show the other person
    const otherMember = conversation.other_members[0];
    if (!otherMember) {
      return {
        name: 'Unknown User',
        image: null,
        initials: '?',
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
  hasUnread = false,
}: ConversationItemProps) => {
  const workspaceId = useWorkspaceId();
  const display = getConversationDisplay(conversation);
  const { getConversationUnreadCount } = useConversationNotifications(workspaceId);
  const { markEntityNotificationsRead } = useMarkEntityNotificationsRead();
  const router = useRouter();

  const unreadCount = getConversationUnreadCount(conversation.id);

  const handleConversationClick = async (e: React.MouseEvent) => {
    e.preventDefault();

    try {
      router.push(`/${workspaceId}/d-${conversation.id}`);
      if (hasUnread) {
        await markEntityNotificationsRead(workspaceId, conversation.id, 'conversation');
      }
    } catch (error) {
      console.error('Error handling conversation click:', error);
      router.push(`/${workspaceId}/d-${conversation.id}`);
    }
  };

  return (
    <Button
      variant="transparent"
      className={cn(conversationItemVariants({ variant }))}
      size="sm"
      asChild
    >
      <Link href={`/${workspaceId}/d-${conversation.id}`} onClick={handleConversationClick}>
        <div className="relative">
          <Avatar className="size-5 rounded-md mr-1">
            <AvatarImage className="rounded-md" src={display.image || undefined} />
            <AvatarFallback className="rounded-md bg-muted text-muted-foreground text-xs">
              {display.initials}
            </AvatarFallback>
          </Avatar>

          {conversation.is_group_conversation && (
            <div className="absolute -bottom-0.5 -right-0.5 bg-sidebar text-color-foreground text-xs rounded-md min-w-[14px] h-3.5 flex items-center justify-center px-1 border border-background">
              {conversation.member_count > 9 ? '9+' : conversation.member_count}
            </div>
          )}

          {/* {!conversation.is_group_conversation && unreadCount === 0 && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
          )} */}
        </div>

        <span className="text-sm truncate flex-1">{display.name}</span>

        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="ml-auto h-5 w-5 flex items-center justify-center p-0 text-xs font-medium"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Link>
    </Button>
  );
};
