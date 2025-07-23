'use client';

import { AlertTriangle, Loader } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';

import { Chat } from '@/components/chat/chat';
import { useCurrentUser } from '@/features/auth';
import {
  useConversations,
  useGetConversationWithMessagesInfinite,
  useRealtimeConversation,
} from '@/features/conversations';
import type { UploadedAttachment } from '@/features/file-upload/types';
import { ChatMember } from '@/features/members';
import { transformMessages, updateSelectedMessageIfNeeded } from '@/features/messages/helpers';
import { useMessageOperations } from '@/features/messages/hooks/use-messages';
import { useMessagesStore } from '@/features/messages/store/messages-store';
import { useToggleReaction } from '@/features/reactions';
import { useParamIds } from '@/hooks/use-param-ids';
import { useUIStore } from '@/stores/ui-store';
import { type Channel, ChannelType } from '@/types/chat';

const ConversationChat = () => {
  const { id: conversationId, workspaceId, type } = useParamIds();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setThreadOpen, setThreadHighlightMessageId } = useUIStore();

  const { user: currentUser, isAuthenticated } = useCurrentUser(workspaceId);
  const { addPendingMessage, removePendingMessage } = useMessagesStore();
  const { conversations } = useConversations(workspaceId);

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

  const currentConversation = useMemo(() => {
    return conversations.find((conversation) => conversation.id === conversationId);
  }, [conversations, conversationId]);

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

  const transformConversation = (
    chatMembers: ChatMember[],
    otherMembers: ChatMember[],
    conversationId: string,
  ): Channel => {
    let displayName = '';
    if (otherMembers.length > 1) {
      displayName = otherMembers.map((member) => member.workspace_member?.user?.name).join(', ');
    } else if (otherMembers.length === 1) {
      displayName = otherMembers[0].workspace_member?.user?.name;
    } else {
      displayName = currentUser?.name || 'You';
    }

    return {
      id: conversationId,
      name: displayName || 'Unknown User',
      description: `Conversation with ${chatMembers.length} members`,
      isPrivate: true,
      memberCount: chatMembers.length,
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
  const conversationChannel = transformConversation(
    currentConversation.members,
    currentConversation.other_members,
    conversationId,
  );

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
        members={currentConversation?.members || []}
      />
    </div>
  );
};

export default ConversationChat;
