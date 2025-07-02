"use client";

import { AlertTriangle, Loader } from "lucide-react";
import { useMemo, useCallback } from "react";

import { Chat } from "@/components/chat/chat";
import {
  useGetChannel,
  useGetChannelWithMessagesInfinite,
  useRealtimeChannel,
  useGetChannelMembers,
  type ChannelMemberData,
} from "@/features/channels";
import { useGetMembers } from "@/features/members";
import { useMessageOperations } from "@/features/messages";
import { useCurrentUser } from "@/features/auth";
import type { Channel } from "@/types/chat";
import { useParamIds } from "@/hooks/use-param-ids";
import type { UploadedAttachment } from "@/features/file-upload";
import type { WorkspaceMember } from "@/types/database";
import {
  transformMessages,
  updateSelectedMessageIfNeeded,
} from "@/features/messages/helpers";
import { useToggleReaction } from "@/features/reactions";
import { useMessagesStore } from "@/features/messages/store/messages-store";

const ChannelChat = () => {
  const { id: channelId, workspaceId, type } = useParamIds();
  const { addPendingMessage, removePendingMessage } = useMessagesStore();

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

  const { isConnected, connectionStatus } = useRealtimeChannel({
    workspaceId,
    channelId,
    currentUserId: currentUser?.id,
    enabled:
      isAuthenticated &&
      Boolean(channelId) &&
      Boolean(workspaceId) &&
      Boolean(currentUser?.id),
  });

  const { createMessage, updateMessage, deleteMessage } = useMessageOperations(
    workspaceId,
    channelId,
    type
  );
  const toggleReaction = useToggleReaction(workspaceId);

  const transformChannel = useCallback(
    (channelData: any): Channel => ({
      id: channelData.id,
      name: channelData.name,
      description: channelData.description,
      isPrivate: channelData.channel_type === "private",
      memberCount: channelData.members?.length || 0,
    }),
    []
  );

  const members = useMemo(() => {
    if (!channelMembersResponse || !workspaceMembers) return [];

    return channelMembersResponse
      .map((channelMember) => {
        const workspaceMember = workspaceMembers.find(
          (wm: WorkspaceMember) => wm.id === channelMember.workspace_member_id
        );

        if (!workspaceMember?.user) return null;

        return {
          id: channelMember.channel_member_id,
          name: workspaceMember.user.name,
          avatar: workspaceMember.user.image || undefined,
          role: channelMember.channel_role,
          workspace_member_id: channelMember.workspace_member_id,
          email: workspaceMember.user.email,
        } as ChannelMemberData;
      })
      .filter((member): member is ChannelMemberData => member !== null);
  }, [channelMembersResponse, workspaceMembers]);

  const handleRefreshData = useCallback(async () => {
    try {
      await Promise.all([
        refetchMessages(),
        refetchChannel(),
        refetchMembers(),
      ]);
    } catch (error) {
      console.error("Failed to refresh channel data:", error);
    }
  }, [refetchMessages, refetchChannel, refetchMembers]);

  const isLoading =
    isLoadingMessages || isLoadingChannel || isLoadingMembers || !currentUser;
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
          {error ? "Failed to load channel" : "Channel not found"}
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

  const allMessages =
    channelWithMessages.pages?.flatMap((page) => {
      return page?.messages || [];
    }) || [];

  const sortedMessages = [...allMessages].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const channel = transformChannel(channelDetails);
  const messages = transformMessages(sortedMessages, currentUser);

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
        message_type: "direct",
        plain_text: content.plainText,
        _optimisticId: optimisticId,
      });

      updateSelectedMessageIfNeeded(
        optimisticId,
        transformMessages([message], currentUser)[0]
      );

      removePendingMessage(optimisticId);
      console.log("Message sent successfully");
    } catch (error) {
      removePendingMessage(optimisticId);
      console.error("Failed to send message:", error);
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      await updateMessage.mutateAsync({
        messageId,
        data: { body: newContent },
      });
    } catch (error) {
      console.error("Failed to edit message:", error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage.mutateAsync(messageId);
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  const handleReactToMessage = async (messageId: string, emoji: string) => {
    try {
      // Check if user already reacted with this emoji
      const message = allMessages.find((msg) => msg.id === messageId);
      const existingReaction = message?.reactions?.find(
        (r) => r.value === emoji
      );
      const hasReacted = existingReaction?.users.some(
        (user: any) => user.id === currentUser?.id
      );

      await toggleReaction.mutateAsync({
        messageId,
        emoji,
        currentlyReacted: hasReacted || false,
      });
    } catch (error) {
      console.error("Failed to react to message:", error);
    }
  };

  const handleReplyToMessage = async (
    messageId: string,
    replyContent: string
  ) => {
    try {
      await createMessage.mutateAsync({
        body: replyContent,
        parent_message_id: messageId,
        message_type: "thread",
      });
      console.log("Reply sent successfully");
    } catch (error) {
      console.error("Failed to reply to message:", error);
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
        onReplyToMessage={handleReplyToMessage}
        onReactToMessage={handleReactToMessage}
        onLoadMore={handleLoadMore}
        hasMoreMessages={hasNextPage}
        isLoadingMore={isFetchingNextPage}
      />
    </div>
  );
};

export default ChannelChat;
