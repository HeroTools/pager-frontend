import { cva, type VariantProps } from 'class-variance-authority';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ConversationEntity } from '@/features/conversations/types';
import { useConversationNotifications } from '@/features/notifications/hooks/use-conversation-notifications';
import { useMarkEntityNotificationsRead } from '@/features/notifications/hooks/use-mark-entity-notifications-read';
import { useWorkspaceId } from '@/hooks/use-workspace-id';
import { cn } from '@/lib/utils';
import { useDraftsStore } from '@/features/drafts/store/use-drafts-store';
import { Pencil } from 'lucide-react';

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

interface ConversationItemProps {
  conversation: ConversationEntity;
  variant?: VariantProps<typeof conversationItemVariants>['variant'];
  hasUnread?: boolean;
}

const getConversationDisplay = (conversation: ConversationEntity, currentUserId: string) => {
  if (conversation.is_group_conversation) {
    // For group conversations, show only other members (not the current user)
    const names = conversation.other_members.map((member) => member.workspace_member.user.name);
    return {
      name: names.join(', '),
      image: conversation.other_members[0]?.workspace_member.user.image || null,
      initials: names
        .map((name) => name.charAt(0))
        .join('')
        .slice(0, 2),
    };
  } else if (conversation.other_members.length === 1) {
    // Direct message
    const otherMember = conversation.other_members[0];
    return {
      name: otherMember.workspace_member.user.name,
      image: otherMember.workspace_member.user.image,
      initials: otherMember.workspace_member.user.name.charAt(0).toUpperCase(),
    };
  } else {
    // Self-conversation
    const selfMember = conversation.members.find(
      (member) => member.workspace_member.user.id === currentUserId,
    );
    return {
      name: selfMember?.workspace_member.user.name || 'You',
      image: selfMember?.workspace_member.user.image || null,
      initials: selfMember?.workspace_member.user.name.charAt(0).toUpperCase() || 'Y',
    };
  }
};

export const ConversationItem = ({
  conversation,
  variant,
  hasUnread = false,
}: ConversationItemProps) => {
  const workspaceId = useWorkspaceId();
  const currentUserId = conversation.members.find((m) => m.workspace_member.user)?.workspace_member
    .user.id;

  const display = getConversationDisplay(conversation, currentUserId);
  const { getConversationUnreadCount } = useConversationNotifications(workspaceId);
  const { markEntityNotificationsRead } = useMarkEntityNotificationsRead();
  const router = useRouter();
  const { getDraft } = useDraftsStore();

  const draft = getDraft(workspaceId, conversation.id);

  const unreadCount = getConversationUnreadCount(conversation.id);
  const isSelfConversation =
    !conversation.is_group_conversation &&
    conversation.other_members.length === 0 &&
    conversation.members.length === 1;

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
        </div>

        <span className="text-sm truncate flex-1 flex items-center gap-1">
          {display.name}
          {isSelfConversation && (
            <span className="ml-1 px-1 py-0.5 rounded bg-muted text-xs text-muted-foreground border border-border">
              you
            </span>
          )}
        </span>

        {draft && variant !== 'active' && <Pencil className="size-3 ml-auto" />}

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
