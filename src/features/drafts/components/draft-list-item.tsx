'use client';

import { Hash, Lock, MessageCircle, MessageSquare, Pencil, Send, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { toast } from 'sonner';

import { Hint } from '@/components/hint';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { useGetChannelWithMessagesInfinite } from '@/features/channels/hooks/use-channels-mutations';
import { Channel } from '@/features/channels/types';
import { useGetConversationWithMessagesInfinite } from '@/features/conversations/hooks/use-conversation-messages';
import { ConversationEntity } from '@/features/conversations/types';
import { Draft, useDraftsStore } from '@/features/drafts/store/use-drafts-store';
import { transformMessages } from '@/features/messages/helpers';
import {
  useCreateChannelMessage,
  useCreateConversationMessage,
  useGetMessageById,
} from '@/features/messages/hooks/use-messages';
import { MessageWithUser } from '@/features/messages/types';
import { useParamIds } from '@/hooks/use-param-ids';
import { cn } from '@/lib/utils/general';
import { useUIStore } from '@/store/ui-store';

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
  const router = useRouter();
  const { workspaceId, type: entityType, id: entityId } = useParamIds();
  const { user } = useCurrentUser(workspaceId);
  const { clearDraft } = useDraftsStore();

  const { setThreadOpen, setThreadHighlightMessageId } = useUIStore();

  const id = entity.id;
  const isThread = !!draft.parentMessageId;

  const { mutateAsync: sendChannelMessage, isPending: isSendingChannel } = useCreateChannelMessage(
    workspaceId,
    id,
  );

  const { mutateAsync: sendConversationMessage, isPending: isSendingConversation } =
    useCreateConversationMessage(workspaceId, id);

  const { data: conversationWithMessages } = useGetConversationWithMessagesInfinite(
    workspaceId,
    entityId,
  );

  const { data: channelMessages } = useGetChannelWithMessagesInfinite(workspaceId, entityId);

  const { data: message, refetch } = useGetMessageById(workspaceId, draft.parentMessageId);

  const isSending = isSendingChannel || isSendingConversation;

  const sendMessage = async () => {
    const messageData = { body: draft.content, attachments: [] };

    try {
      if (draft.type === 'channel') {
        await sendChannelMessage(messageData);
      } else {
        await sendConversationMessage(messageData);
      }
      clearDraft(workspaceId, id, draft.parentMessageId);
      toast.success('Message sent!');
    } catch (error) {
      toast.error('Failed to send message.');
    }
  };

  const handleDelete = () => {
    clearDraft(workspaceId, id, draft.parentMessageId);
    toast.success('Draft deleted.');
  };

  const display: ConversationDisplay | null = useMemo(() => {
    if (draft.type === 'conversation' && !user) return null;

    if (draft.type === 'channel') {
      const channel = entity as Channel;
      return {
        name: isThread
          ? `Thread in ${channel?.name ?? 'Unknown Channel'}`
          : (channel?.name ?? 'Unknown Channel'),
        membersToDisplay: [],
        icon: channel?.channel_type === 'private' ? Lock : Hash,
        link: `/${workspaceId}/c-${id}`,
      };
    }
    if (draft.type === 'conversation') {
      const conversation = entity as ConversationEntity;
      const conversationInfo = getConversationDisplayInfo(conversation, user?.id);
      return {
        ...conversationInfo,
        name: isThread ? `Thread in ${conversationInfo.name}` : conversationInfo.name,
        icon: isThread ? MessageCircle : undefined,
      };
    }
    return {
      name: 'Unknown',
      membersToDisplay: [],
      icon: MessageSquare,
      link: '',
    };
  }, [id, draft.type, entity, workspaceId, user, isThread]);

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

  const handleClick = async () => {
    if (isThread) {
      let cached: MessageWithUser | undefined;
      if (entityType === 'channel') {
        const allChannelMessages = channelMessages?.pages.flatMap((page) => page.messages) ?? [];
        cached = allChannelMessages.find((m) => m.id === draft.parentMessageId);
      } else {
        const allConversationMessages =
          conversationWithMessages?.pages.flatMap((page) => page.messages) ?? [];
        cached = allConversationMessages.find((m) => m.id === draft.parentMessageId);
      }

      if (cached) {
        const transformed = transformMessages([cached], user);
        setThreadOpen(transformed[0]);
        setThreadHighlightMessageId(transformed[0].id);
      } else {
        const { data: fetchedMessage } = await refetch();
        if (fetchedMessage) {
          const transformed = transformMessages([fetchedMessage], user);
          setThreadOpen(transformed[0]);
          setThreadHighlightMessageId(transformed[0].id);
        }
      }
    } else {
      router.push(display.link);
    }
  };

  return (
    <div
      className="group flex items-start gap-3 p-2 rounded-md hover:bg-secondary/50 cursor-pointer"
      onClick={handleClick}
    >
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
        {isThread && draft.parentAuthorName && (
          <p className="text-xs text-muted-foreground">Reply to {draft.parentAuthorName}</p>
        )}
        <p className="text-sm text-muted-foreground truncate">{draft.text}</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Hint label="Delete draft" side="top">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </Hint>
        <Hint label="Edit draft" side="top">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={(e) => {
              e.stopPropagation();
              if (isThread) {
                handleClick();
              } else {
                router.push(display.link);
              }
            }}
          >
            <Pencil className="size-4" />
          </Button>
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
  );
};
