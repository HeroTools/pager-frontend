'use client';

import { Hash, Lock, Pencil, Send, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { toast } from 'sonner';

import { Hint } from '@/components/hint';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { Channel } from '@/features/channels/types';
import { ConversationEntity } from '@/features/conversations/types';
import { type Draft, useDraftsStore } from '@/features/drafts/store/use-drafts-store';
import {
  useCreateChannelMessage,
  useCreateConversationMessage,
} from '@/features/messages/hooks/use-messages';
import { useWorkspaceId } from '@/hooks/use-workspace-id';
import { cn } from '@/lib/utils/general';
import { formatDistanceToNow } from 'date-fns';

interface DraftListItemProps {
  draft: Draft;
  entity: Channel | ConversationEntity;
}

interface ConversationDisplay {
  name: string;
  link: string;
  membersToDisplay: { image: string | null; name: string }[];
  icon?: React.ElementType;
}

const getConversationDisplayInfo = (
  conversation: ConversationEntity,
  currentUserId: string,
): Omit<ConversationDisplay, 'icon'> => {
  const link = `/${conversation.workspace_id}/d-${conversation.id}`;

  if (conversation.is_group_conversation) {
    const names = conversation.other_members.map((m) => m.workspace_member.user.name);
    return {
      name: names.join(', '),
      membersToDisplay: conversation.other_members.map((m) => ({
        image: m.workspace_member.user.image,
        name: m.workspace_member.user.name,
      })),
      link,
    };
  }

  if (conversation.other_members.length === 1) {
    const other = conversation.other_members[0];
    return {
      name: other.workspace_member.user.name,
      membersToDisplay: [
        {
          image: other.workspace_member.user.image,
          name: other.workspace_member.user.name,
        },
      ],
      link,
    };
  }

  const you = conversation.members.find((m) => m.workspace_member.user_id === currentUserId);
  return {
    name: 'You',
    membersToDisplay: [
      {
        image: you?.workspace_member.user.image ?? null,
        name: 'You',
      },
    ],
    link,
  };
};

export const DraftListItem = ({ draft, entity }: DraftListItemProps) => {
  const workspaceId = useWorkspaceId();
  const { user } = useCurrentUser(workspaceId);
  const { clearDraft } = useDraftsStore();
  const id = entity.id;

  const { mutateAsync: sendChannelMessage, isPending: sendingChan } = useCreateChannelMessage(
    workspaceId,
    id,
  );
  const { mutateAsync: sendConversationMessage, isPending: sendingConv } =
    useCreateConversationMessage(workspaceId, id);
  const isSending = sendingChan || sendingConv;

  const sendMessage = async () => {
    const payload = { body: draft.content, attachments: [] };
    try {
      if (draft.type === 'channel') {
        await sendChannelMessage(payload);
      } else {
        await sendConversationMessage(payload);
      }
      clearDraft(workspaceId, id);
      toast.success('Message sent!');
    } catch {
      toast.error('Failed to send message.');
    }
  };

  const display = useMemo<ConversationDisplay | null>(() => {
    if (draft.type === 'conversation' && !user) return null;
    if (draft.type === 'channel') {
      const ch = entity as Channel;
      return {
        name: ch.name ?? 'Unknown Channel',
        membersToDisplay: [],
        icon: ch.channel_type === 'private' ? Lock : Hash,
        link: `/${workspaceId}/c-${id}`,
      };
    }
    return getConversationDisplayInfo(entity as ConversationEntity, user.id);
  }, [draft.type, entity, workspaceId, user, id]);

  const formattedDate = useMemo(
    () => formatDistanceToNow(new Date(draft.updatedAt), { addSuffix: true }),
    [draft.updatedAt],
  );

  if (!display) {
    return (
      <div className="flex items-start gap-3 p-2 rounded-md">
        <Skeleton className="size-5 mt-1 rounded-full" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <Link
      href={display.link}
      className="group flex items-start gap-3 p-2 rounded-md hover:bg-secondary/50 cursor-pointer"
    >
      {display.membersToDisplay.length > 0 ? (
        display.membersToDisplay.length > 1 ? (
          <div className="relative flex items-center mt-1">
            {display.membersToDisplay.slice(0, 2).map((m, i) => (
              <Avatar
                key={`${m.name}-${i}`}
                className={cn('size-5 border-2 border-background', i > 0 && '-ml-3')}
              >
                <AvatarImage src={m.image ?? undefined} />
                <AvatarFallback>{m.name[0]}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        ) : (
          <Avatar className="size-5 mt-1">
            <AvatarImage src={display.membersToDisplay[0].image ?? undefined} />
            <AvatarFallback>{display.membersToDisplay[0].name[0]}</AvatarFallback>
          </Avatar>
        )
      ) : (
        display.icon && <display.icon className="size-5 text-muted-foreground mt-1 shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate min-w-0">{display.name}</p>
        <p className="text-sm text-muted-foreground line-clamp-1 min-w-0">{draft.text}</p>
      </div>

      <div className="relative flex items-center">
        <span className="text-xs text-muted-foreground shrink-0 opacity-100 group-hover:opacity-0 transition-opacity">
          {formattedDate}
        </span>
        <div className="absolute right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity border border-border-default rounded-md p-0.5 top-0.5 bg-secondary">
          <Hint label="Delete draft" side="top">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={(e) => {
                e.preventDefault();
                clearDraft(workspaceId, id);
                toast.success('Draft deleted.');
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </Hint>
          <Hint label="Edit draft" side="top">
            <Link href={display.link}>
              <Button variant="ghost" size="icon" className="size-8">
                <Pencil className="size-4" />
              </Button>
            </Link>
          </Hint>
          <Hint label="Send message" side="top">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              disabled={isSending}
            >
              <Send className="size-4" />
            </Button>
          </Hint>
        </div>
      </div>
    </Link>
  );
};
