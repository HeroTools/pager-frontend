'use client';

import { Chat } from '@/components/chat/chat';
import { useCurrentUser } from '@/features/auth';
import type { ChannelEntity } from '@/features/channels';
import {
  type ChannelMemberData,
  useGetChannel,
  useGetChannelMembers,
  useGetChannelWithMessagesInfinite,
  useRealtimeChannel,
} from '@/features/channels';
import type { UploadedAttachment } from '@/features/file-upload';
import { useGetMembers } from '@/features/members';
import { useMessageOperations } from '@/features/messages';
import { transformMessages, updateSelectedMessageIfNeeded } from '@/features/messages/helpers';
import { useMessagesStore } from '@/features/messages/store/messages-store';
import { useToggleReaction } from '@/features/reactions';
import { useParamIds } from '@/hooks/use-param-ids';
import { useUIStore } from '@/store/ui-store';
import { type Channel, ChannelType } from '@/types/chat';
import type { WorkspaceMember } from '@/types/database';
import { AlertTriangle, Loader } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo } from 'react';

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
    refetch: refetchMessages,
  } = useGetChannelWithMessagesInfinite(workspaceId, channelId);

  const {
    data: channelDetails,
    isLoading: isLoadingChannel,
    error: channelError,
    refetch: refetchChannel,
  } = useGetChannel(workspaceId, channelId);

  const {
    data: channelMembersResponse,
    isLoading: isLoadingMembers,
    error: membersError,
    refetch: refetchMembers,
  } = useGetChannelMembers(workspaceId, channelId);

  const { data: workspaceMembers } = useGetMembers(workspaceId);

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
      memberCount: channelData.members?.length || 0,
      isDefault: channelData.is_default || false,
    }),
    [],
  );

  const members = useMemo(() => {
    if (!channelMembersResponse || !workspaceMembers) {
      return [];
    }

    return channelMembersResponse
      .map((channelMember) => {
        const workspaceMember = workspaceMembers.find(
          (wm: WorkspaceMember) => wm.id === channelMember.workspace_member_id,
        );

        if (!workspaceMember?.user) {
          return null;
        }

        return {
          id: channelMember.channel_member_id,
          name: workspaceMember.user.name,
          avatar: workspaceMember.user.image || undefined,
          role: channelMember.channel_role,
          workspace_member_id: channelMember.workspace_member_id,
          email: workspaceMember.user.email,
          user_id: workspaceMember.user.id,
        } as ChannelMemberData;
      })
      .filter((member): member is ChannelMemberData => member !== null);
  }, [channelMembersResponse, workspaceMembers]);

  const handleRefreshData = useCallback(async () => {
    try {
      await Promise.all([refetchMessages(), refetchChannel(), refetchMembers()]);
    } catch (error) {
      console.error('Failed to refresh channel data:', error);
    }
  }, [refetchMessages, refetchChannel, refetchMembers]);

  const isLoading = isLoadingMessages || isLoadingChannel || isLoadingMembers || !currentUser;
  const error = messagesError || channelError || membersError;

  if (isLoading) {
    return (
      <div className="h-full flex-1 flex items-center justify-center">
        <Loader className="animate-spin size-5 text-muted-foreground" />
      </div>
    );
  }

  if (error || !channelWithMessages || !channelDetails) {
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

  const channel = transformChannel(channelDetails);

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

export default ChannelChat;
