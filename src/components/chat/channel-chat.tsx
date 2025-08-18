'use client';

import { AlertTriangle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo } from 'react';

import { Chat } from '@/components/chat/chat';
import { useCurrentUser } from '@/features/auth';
import {
  type ChannelEntity,
  useGetChannel,
  useGetChannelWithMessagesInfinite,
  useRealtimeChannel,
} from '@/features/channels';
import type { UploadedAttachment } from '@/features/file-upload';
import { useChannelMembers } from '@/features/members/hooks/use-channel-members';
import { useMessageOperations } from '@/features/messages';
import { transformMessages, updateSelectedMessageIfNeeded } from '@/features/messages/helpers';
import { useMessagesStore } from '@/features/messages/store/messages-store';
import { useToggleReaction } from '@/features/reactions';
import { useParamIds } from '@/hooks/use-param-ids';
import { useUIStore } from '@/stores/ui-store';
import { type Channel, ChannelType } from '@/types/chat';

const ChannelChat = () => {
  const { id: channelId, workspaceId, type } = useParamIds();
  const { addPendingMessage, removePendingMessage } = useMessagesStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setThreadOpen, setThreadHighlightMessageId } = useUIStore();

  const { user: currentUser, isAuthenticated } = useCurrentUser(workspaceId);

  const {
    data: channelWithMessages,
    isLoading: isLoadingMessages,
    error: messagesError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchChannelMessages,
  } = useGetChannelWithMessagesInfinite(workspaceId, channelId);

  const {
    data: channelDetails,
    isLoading: isLoadingChannel,
    error: channelError,
    refetch: refetchChannel,
  } = useGetChannel(workspaceId, channelId);

  const { members, isUserInChannel } = useChannelMembers(workspaceId, channelId, true);

  const isChannelMember = useMemo(
    () => isUserInChannel(currentUser?.id || ''),
    [isUserInChannel, currentUser?.id],
  );

  useRealtimeChannel({
    workspaceId,
    channelId,
    currentUserId: currentUser?.id,
    enabled:
      isAuthenticated && Boolean(channelId) && Boolean(workspaceId) && Boolean(currentUser?.id),
  });

  const { createMessage, updateMessage, deleteMessage } = useMessageOperations(
    workspaceId,
    channelId,
    type,
  );
  const toggleReaction = useToggleReaction(workspaceId);

  const allMessages = useMemo(
    () => channelWithMessages?.pages?.flatMap((page) => page?.messages || []) || [],
    [channelWithMessages],
  );

  const sortedMessages = useMemo(
    () =>
      [...allMessages].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      ),
    [allMessages],
  );

  const messages = useMemo(
    () => transformMessages(sortedMessages, currentUser),
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
        // Clear the query param
        const newUrl = `/${workspaceId}/${type === 'channel' ? 'c' : 'd'}-${channelId}`;
        router.replace(newUrl, { scroll: false });
      }
    }
  }, [
    threadMessageId,
    messages,
    setThreadOpen,
    router,
    workspaceId,
    channelId,
    type,
    highlightMessageId,
    isLoadingMessages,
    setThreadHighlightMessageId,
  ]);

  const transformChannel = useCallback(
    (channelData: ChannelEntity): Channel => ({
      id: channelData.id,
      name: channelData.name,
      description: channelData.description,
      isPrivate: channelData.channel_type === ChannelType.PRIVATE,
      type: channelData.channel_type as ChannelType,
      memberCount: members?.length || 0,
      isDefault: channelData.is_default || false,
    }),
    [members],
  );

  const handleRefreshData = useCallback(async () => {
    try {
      await Promise.all([refetchChannelMessages(), refetchChannel()]);
    } catch (error) {
      console.error('Failed to refresh channel data:', error);
    }
  }, [refetchChannelMessages, refetchChannel]);

  const isLoading = !currentUser || isLoadingChannel || isLoadingMessages;
  const error = messagesError || channelError;

  const channel = useMemo(() => {
    if (channelDetails) {
      return transformChannel(channelDetails);
    }
    return {
      id: channelId,
      name: '',
      description: '',
      isPrivate: false,
      type: ChannelType.PUBLIC,
      memberCount: 0,
      isDefault: false,
    };
  }, [channelDetails, channelId, transformChannel]);

  if (error && !isLoading) {
    return (
      <div className="h-full flex-1 flex flex-col gap-y-2 items-center justify-center">
        <AlertTriangle className="size-5 text-muted-foreground" />
        <span className="text-muted-foreground text-sm">
          {error ? 'Failed to load channel' : 'Channel not found'}
        </span>
        <button
          onClick={handleRefreshData}
          className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const handleSendMessage = async (content: {
    body: string;
    attachments: UploadedAttachment[];
    plainText: string;
  }) => {
    const optimisticId = `temp-${Date.now()}-${Math.random()}`;

    // Track that we're creating this message
    addPendingMessage(optimisticId, {
      workspaceId,
      channelId,
      entityId: channelId,
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

      const transformedMessage = transformMessages([message], currentUser)[0];

      if (!transformedMessage) {
        throw new Error('Failed to transform message');
      }

      updateSelectedMessageIfNeeded(optimisticId, transformedMessage);

      removePendingMessage(optimisticId);
      console.log('Message sent successfully');
    } catch (error) {
      removePendingMessage(optimisticId);
      console.error('Failed to send message:', error);
    }
  };

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

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage.mutateAsync(messageId);
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

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

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Chat
        channel={channel}
        messages={messages}
        currentUser={currentUser}
        chatType="channel"
        members={members}
        isLoading={isLoading}
        isDisabled={isLoading}
        onSendMessage={handleSendMessage}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        onReactToMessage={handleReactToMessage}
        onLoadMore={handleLoadMore}
        hasMoreMessages={hasNextPage}
        isLoadingMore={isFetchingNextPage}
        highlightMessageId={highlightMessageId}
        isChannelMember={isChannelMember}
      />
    </div>
  );
};

export default ChannelChat;
