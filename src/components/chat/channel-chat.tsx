"use client";

import { AlertTriangle, Loader } from "lucide-react";

import { Chat } from "@/components/chat/chat";
import {
  useGetChannel,
  useGetChannelWithMessagesInfinite,
  useRealtimeChannel,
} from "@/features/channels";
import { useMessageOperations } from "@/features/messages";
import { useCurrentUser } from "@/features/auth";
import { Author, Channel } from "@/types/chat";
import { useParamIds } from "@/hooks/use-param-ids";
import { UploadedAttachment } from "@/features/file-upload/types";
import {
  transformMessages,
  updateSelectedMessageIfNeeded,
} from "@/features/messages/helpers";
import { useToggleReaction } from "@/features/reactions";
import { useMessagesStore } from "@/features/messages/store/messages-store";

const ChannelChat = () => {
  const { id: channelId, workspaceId, type } = useParamIds();
  const { user: currentUser, isAuthenticated } = useCurrentUser(workspaceId);
  const { addPendingMessage, removePendingMessage } = useMessagesStore();

  const {
    data: channelWithMessages,
    isLoading: isLoadingMessages,
    error: messagesError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetChannelWithMessagesInfinite(workspaceId, channelId);

  const {
    data: channelDetails,
    isLoading: isLoadingChannel,
    error: channelError,
  } = useGetChannel(workspaceId, channelId);

  // Real-time subscription for incoming messages and typing indicators
  const { isConnected, connectionStatus } = useRealtimeChannel({
    workspaceId,
    channelId,
    currentUserId: currentUser?.id,
    enabled: isAuthenticated && !!channelId && !!workspaceId,
  });

  // Typing indicator for current user
  // const {
  //   handleInputChange,
  //   handleSubmit: handleTypingSubmit,
  //   isTyping,
  // } = useTypingIndicator(workspaceId, channelId, undefined);

  const { createMessage, updateMessage, deleteMessage } = useMessageOperations(
    workspaceId,
    channelId,
    type
  );
  const toggleReaction = useToggleReaction(workspaceId);

  const transformChannel = (channelData: any): Channel => ({
    id: channelData.id,
    name: channelData.name,
    description: channelData.description,
    isPrivate: channelData.channel_type === "private",
    memberCount: channelData.members?.length || 0,
  });

  const transformCurrentUser = (userData: any): Author => ({
    id: userData.id,
    name: userData.name,
    avatar: userData.image,
    status: "online" as const,
  });

  // Transform typing users for display
  // const transformedTypingUsers = typingUsers.map((tu) => ({
  //   id: tu.user.id,
  //   name: tu.user.name,
  //   avatar: tu.user.image,
  // }));

  // Combined loading state
  const isLoading = isLoadingMessages || isLoadingChannel || !currentUser;
  const error = messagesError || channelError;

  if (isLoading) {
    return (
      <div className="h-full flex-1 flex items-center justify-center">
        <Loader className="animate-spin size-5 text-muted-foreground" />
      </div>
    );
  }

  // Handle error states
  if (error || !channelWithMessages || !channelDetails) {
    return (
      <div className="h-full flex-1 flex flex-col gap-y-2 items-center justify-center">
        <AlertTriangle className="size-5 text-muted-foreground" />
        <span className="text-muted-foreground text-sm">
          {error ? "Failed to load channel" : "Channel not found"}
        </span>
      </div>
    );
  }

  const allMessages =
    channelWithMessages.pages?.flatMap((page, pageIndex) => {
      return page?.messages || [];
    }) || [];

  const sortedMessages = [...allMessages].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Transform data for chat component
  const channel = transformChannel(channelDetails);
  const messages = transformMessages(sortedMessages, currentUser);
  const user = transformCurrentUser(currentUser);

  // Handle message sending with real-time integration
  const handleSendMessage = async (content: {
    body: string;
    attachments: UploadedAttachment[];
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
      // Stop typing indicator immediately when sending
      // handleTypingSubmit();
      const message = await createMessage.mutateAsync({
        body: content.body,
        attachments: content.attachments,
        message_type: "direct",
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

  // Handle message editing
  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      await updateMessage.mutateAsync({
        messageId,
        data: { body: newContent },
      });

      console.log("Message edited successfully");
    } catch (error) {
      console.error("Failed to edit message:", error);
    }
  };

  // Handle message deletion
  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage.mutateAsync(messageId);
      console.log("Message deleted successfully");
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  // Handle message reactions
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

  // Handle replies/threads
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

  // Handle channel details toggle
  const handleToggleChannelDetails = () => {
    // Replace with your channel details logic
    console.log("Toggle channel details");
  };

  // Handle loading more messages (when user scrolls up)
  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Connection status indicator (optional) */}
      {!isConnected && (
        <div className="bg-warning/50 border-b border-warning px-4 py-2 text-sm text-warning">
          Reconnecting to real-time updates... (Status: {connectionStatus})
        </div>
      )}

      <Chat
        channel={channel}
        messages={messages}
        currentUser={user}
        chatType="channel"
        // typingUsers={transformedTypingUsers} // Pass typing users to Chat component
        isLoading={
          false
          // createMessage.isPending ||
          // updateMessage.isPending ||
          // deleteMessage.isPending
        }
        onSendMessage={handleSendMessage}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        onReplyToMessage={handleReplyToMessage}
        onReactToMessage={handleReactToMessage}
        onToggleChannelDetails={handleToggleChannelDetails}
        // Pass typing handlers to your message input component
        // onInputChange={handleInputChange}
        // onTypingSubmit={handleTypingSubmit}
        // Handle infinite scroll
        onLoadMore={handleLoadMore}
        hasMoreMessages={hasNextPage}
        isLoadingMore={isFetchingNextPage}
      />
    </div>
  );
};

export default ChannelChat;
