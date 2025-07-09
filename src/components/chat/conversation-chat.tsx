'use client';

import { AlertTriangle, Loader } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';

import { Chat } from '@/components/chat/chat';
import { useCurrentUser } from '@/features/auth';
import type {
  ConversationMemberWithDetails,
  ConversationMemberWithUser,
  ConversationWithMessagesAndMembers,
} from '@/features/conversations';
import {
  useGetConversationWithMessagesInfinite,
  useRealtimeConversation,
} from '@/features/conversations';
import type { UploadedAttachment } from '@/features/file-upload/types';
import { transformMessages, updateSelectedMessageIfNeeded } from '@/features/messages/helpers';
import { useMessageOperations } from '@/features/messages/hooks/use-messages';
import { useMessagesStore } from '@/features/messages/store/messages-store';
import { useToggleReaction } from '@/features/reactions';
import { useParamIds } from '@/hooks/use-param-ids';
import { useUIStore } from '@/store/ui-store';
import type { Channel } from '@/types/chat';
import { ChannelType } from '@/types/chat';

const ConversationChat = () => {
  const { id: conversationId, workspaceId, type } = useParamIds();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setThreadOpen, setThreadHighlightMessageId } = useUIStore();

  const { user: currentUser, isAuthenticated } = useCurrentUser(workspaceId);
  const { addPendingMessage, removePendingMessage } = useMessagesStore();

  const {
    data: conversationWithMessages,
    isLoading: isLoadingMessages,
    error: messagesError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetConversationWithMessagesInfinite(workspaceId, conversationId);

  // Real-time subscription for incoming messages and typing indicators
  const { isConnected, connectionStatus } = useRealtimeConversation({
    workspaceId,
    conversationId,
    currentUserId: currentUser?.id,
    enabled:
      isAuthenticated &&
      Boolean(currentUser?.id) &&
      Boolean(conversationId) &&
      Boolean(workspaceId),
  });

  // Message operation hooks
  const { createMessage, updateMessage, deleteMessage } = useMessageOperations(
    workspaceId,
    conversationId,
    type,
  );
  const toggleReaction = useToggleReaction(workspaceId);

  const allMessages = useMemo(
    () => conversationWithMessages?.pages.flatMap((page) => page?.messages || []) || [],
    [conversationWithMessages],
  );

  const sortedMessages = useMemo(
    () =>
      [...allMessages].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      ),
    [allMessages],
  );

  const messages = useMemo(
    () => transformMessages(sortedMessages || [], currentUser),
    [sortedMessages, currentUser],
  );

  const highlightMessageId = searchParams.get('highlight');
  const threadMessageId = searchParams.get('thread');

  useEffect(() => {
    if (threadMessageId && messages.length > 0 && !isLoadingMessages) {
      const parentMessage = messages.find((m) => m.id === threadMessageId);
      if (parentMessage) {
        setThreadOpen(parentMessage);
        setThreadHighlightMessageId(highlightMessageId);
        const newUrl = `/${workspaceId}/${type === 'channel' ? 'c' : 'd'}-${conversationId}`;
        router.replace(newUrl, { scroll: false });
      }
    }
  }, [
    threadMessageId,
    messages,
    setThreadOpen,
    router,
    workspaceId,
    conversationId,
    type,
    highlightMessageId,
    isLoadingMessages,
    setThreadHighlightMessageId,
  ]);

  const transformConversation = (conversationData: ConversationWithMessagesAndMembers): Channel => {
    const { conversation, members } = conversationData;

    type UnifiedMember = ConversationMemberWithDetails | ConversationMemberWithUser;

    let otherMembers: UnifiedMember[] = [];

    if (conversation.other_members) {
      otherMembers = conversation.other_members;
    } else {
      otherMembers = members.filter((member) => member.user.id !== currentUser?.id);
    }

    const getName = (member: UnifiedMember): string => {
      if ('workspace_member' in member) {
        return member.workspace_member.user.name;
      } else {
        return member.user.name;
      }
    };

    let displayName = '';
    if (conversation.is_group_conversation) {
      displayName = otherMembers.map(getName).join(', ');
    } else if (otherMembers.length === 1) {
      displayName = getName(otherMembers[0]);
    } else {
      displayName = currentUser?.name || 'You';
    }

    return {
      id: conversation.id,
      name: displayName || 'Unknown User',
      description: `Conversation with ${members.length} members`,
      isPrivate: true,
      memberCount: members.length,
      type: ChannelType.PRIVATE,
    };
  };

  const isLoading = isLoadingMessages || !currentUser;
  const error = messagesError;

  if (isLoading || !currentUser) {
    return (
      <div className="h-full flex-1 flex items-center justify-center">
        <Loader className="animate-spin size-5 text-muted-foreground" />
      </div>
    );
  }

  // Handle error states
  if (error || !conversationWithMessages) {
    return (
      <div className="h-full flex-1 flex flex-col gap-y-2 items-center justify-center">
        <AlertTriangle className="size-5 text-muted-foreground" />
        <span className="text-muted-foreground text-sm">
          {error ? 'Failed to load conversation' : 'Conversation not found'}
        </span>
      </div>
    );
  }

  // Transform data for chat component
  const conversationChannel = transformConversation(conversationWithMessages?.pages?.[0]);

  // Handle message sending with real-time integration
  const handleSendMessage = async (content: {
    body: string;
    attachments: UploadedAttachment[];
    plainText: string;
  }) => {
    const optimisticId = `temp-${Date.now()}-${Math.random()}`;

    // Track that we're creating this message
    addPendingMessage(optimisticId, {
      workspaceId,
      conversationId,
      entityId: conversationId,
      entityType: type,
    });
    try {
      const message = await createMessage.mutateAsync({
        body: content.body,
        attachments: content.attachments,
        message_type: 'direct',
        plain_text: content.plainText,
        _optimisticId: optimisticId,
      });

      updateSelectedMessageIfNeeded(optimisticId, transformMessages([message], currentUser)[0]);

      removePendingMessage(optimisticId);
    } catch (error) {
      removePendingMessage(optimisticId);
      console.error('Failed to send message:', error);
    }
  };

  // Handle message editing
  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      await updateMessage.mutateAsync({
        messageId,
        data: { body: newContent },
      });
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  };

  // Handle message deletion
  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage.mutateAsync(messageId);
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  // Handle message reactions
  const handleReactToMessage = async (messageId: string, emoji: string) => {
    try {
      // Check if user already reacted with this emoji
      const message = allMessages.find((msg) => msg.id === messageId);
      const existingReaction = message?.reactions?.find((r) => r.value === emoji);
      const hasReacted = existingReaction?.users.some((user) => user.id === currentUser?.id);
      await toggleReaction.mutateAsync({
        messageId,
        emoji,
        currentlyReacted: hasReacted || false,
      });
    } catch (error) {
      console.error('Failed to react to message:', error);
    }
  };

  // Handle loading more messages (when user scrolls up)
  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {!isConnected && (
        <div className="bg-warning/50 border-b border-warning px-4 py-2 text-sm text-warning">
          Reconnecting to real-time updates... (Status: {connectionStatus})
        </div>
      )}

      <Chat
        channel={conversationChannel}
        messages={messages}
        currentUser={currentUser}
        chatType="conversation"
        conversationData={conversationWithMessages?.pages?.[0]}
        isLoading={false}
        onSendMessage={handleSendMessage}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        onReactToMessage={handleReactToMessage}
        onLoadMore={handleLoadMore}
        hasMoreMessages={hasNextPage}
        isLoadingMore={isFetchingNextPage}
        highlightMessageId={highlightMessageId}
      />
    </div>
  );
};

export default ConversationChat;
