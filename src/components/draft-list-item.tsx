'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useDraftsStore } from '@/features/drafts/store/use-drafts-store';
import { useWorkspaceId } from '@/hooks/use-workspace-id';
import { cn } from '@/lib/utils/general';
import { Hash, Lock, MessageSquare, Trash2, Pencil, Send } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { Hint } from '@/components/hint';
import { toast } from 'sonner';
import { ConversationEntity } from '@/features/conversations/types';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { Skeleton } from '@/components/ui/skeleton';
import { Channel } from '@/features/channels/types';
import {
  useCreateChannelMessage,
  useCreateConversationMessage,
} from '@/features/messages/hooks/use-messages';

interface DraftListItemProps {
  draft: ReturnType<typeof useDraftsStore.getState>['drafts'][string];
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
  const workspaceId = conversation.workspace_id;
  const link = `/${workspaceId}/d-${conversation.id}`;

  if (conversation.is_group_conversation) {
    const names = conversation.other_members.map(
      (member: any) => member.workspace_member.user.name,
    );
    return {
      name: names.join(', '),
      membersToDisplay: conversation.other_members.map((m) => ({
        image: m.workspace_member.user.image,
        name: m.workspace_member.user.name,
      })),
      link,
    };
  } else if (conversation.other_members.length === 1) {
    const otherMember = conversation.other_members[0];
    return {
      name: otherMember.workspace_member.user.name,
      membersToDisplay: [
        {
          image: otherMember.workspace_member.user.image,
          name: otherMember.workspace_member.user.name,
        },
      ],
      link,
    };
  }
  const currentUserMember = conversation.members.find(
    (m) => m.workspace_member.user_id === currentUserId,
  );
  return {
    name: 'You',
    membersToDisplay: [
      {
        image: currentUserMember?.workspace_member.user.image || null,
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

  const {
    mutateAsync: sendChannelMessage,
    isPending: isSendingChannel,
  } = useCreateChannelMessage(workspaceId, id);

  const {
    mutateAsync: sendConversationMessage,
    isPending: isSendingConversation,
  } = useCreateConversationMessage(workspaceId, id);

  const isSending = isSendingChannel || isSendingConversation;

  const sendMessage = async () => {
    const messageData = { body: draft.content, attachments: [] };

    try {
      if (draft.type === 'channel') {
        await sendChannelMessage(messageData);
      } else {
        await sendConversationMessage(messageData);
      }
      clearDraft(id);
      toast.success('Message sent!');
    } catch (error) {
      toast.error('Failed to send message.');
    }
  };

  const handleDelete = () => {
    clearDraft(id);
    toast.success('Draft deleted.');
  };

  const display: ConversationDisplay | null = useMemo(() => {
    if (draft.type === 'conversation' && !user) return null;

    if (draft.type === 'channel') {
      const channel = entity as Channel;
      return {
        name: channel?.name ?? 'Unknown Channel',
        membersToDisplay: [],
        icon: channel?.channel_type === 'private' ? Lock : Hash,
        link: `/${workspaceId}/c-${id}`,
      };
    }
    if (draft.type === 'conversation') {
      const conversation = entity as ConversationEntity;
      return getConversationDisplayInfo(conversation, user!.id);
    }
    return {
      name: 'Unknown',
      membersToDisplay: [],
      icon: MessageSquare,
      link: '',
    };
  }, [id, draft.type, entity, workspaceId, user]);

  const rawContent = useMemo(() => {
    try {
      const delta = JSON.parse(draft.content);
      return (
        delta.ops
          ?.map((op: any) => op.insert)
          .join('')
          .trim() ?? ''
      );
    } catch {
      return draft.content;
    }
  }, [draft.content]);

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
    <div className="group flex items-start gap-3 p-2 rounded-md hover:bg-secondary/50">
      {display.membersToDisplay.length > 0 ? (
        display.membersToDisplay.length > 1 ? (
          <div className="relative flex items-center mt-1">
            {display.membersToDisplay.slice(0, 2).map((member, index) => (
              <Avatar
                key={`${member.name}-${index}`}
                className={cn('size-5 border-2 border-background', index > 0 && '-ml-3')}
              >
                <AvatarImage src={member.image ?? undefined} />
                <AvatarFallback>{member.name?.[0]}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        ) : (
          <Avatar className="size-5 mt-1">
            <AvatarImage src={display.membersToDisplay[0].image ?? undefined} />
            <AvatarFallback>{display.membersToDisplay[0].name?.[0]}</AvatarFallback>
          </Avatar>
        )
      ) : (
        display.icon && <display.icon className="size-5 text-muted-foreground mt-1 shrink-0" />
      )}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold">{display.name}</p>
        </div>
        <p className="text-sm text-muted-foreground truncate">{rawContent}</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Hint label="Delete draft" side="top">
          <Button variant="ghost" size="icon" className="size-8" onClick={handleDelete}>
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
            onClick={sendMessage}
            disabled={isSending}
          >
            <Send className="size-4" />
          </Button>
        </Hint>
      </div>
    </div>
  );
};
