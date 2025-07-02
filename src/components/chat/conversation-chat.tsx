"use client";

import { AlertTriangle, Loader } from "lucide-react";

import { Chat } from "@/components/chat/chat";
import {
  useGetConversationWithMessagesInfinite,
  useRealtimeConversation,
} from "@/features/conversations";
import { useMessageOperations } from "@/features/messages/hooks/use-messages";
import { useCurrentUser } from "@/features/auth";
import { Channel } from "@/types/chat";
import { useParamIds } from "@/hooks/use-param-ids";
import { UploadedAttachment } from "@/features/file-upload/types";
import {
  transformMessages,
  updateSelectedMessageIfNeeded,
} from "@/features/messages/helpers";
import { useToggleReaction } from "@/features/reactions";
import { useMessagesStore } from "@/features/messages/store/messages-store";
import { useCallback } from "react";

const ConversationChat = () => {
  const { id: conversationId, workspaceId, type } = useParamIds();

  const { user: currentUser, isAuthenticated } = useCurrentUser(workspaceId);
  const { addPendingMessage, removePendingMessage } = useMessagesStore();

  const {
    data: conversationWithMessages,
    isLoading: isLoadingMessages,
    error: messagesError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchMessages,
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
    type
  );
  const toggleReaction = useToggleReaction(workspaceId);

  const transformConversation = (conversationData: any): Channel => {
    const otherMembers = conversationData.members.filter(
      (member: any) => member.user.id !== currentUser?.id
    );
    const displayName =
      otherMembers.length === 1
        ? otherMembers[0].user.name
        : `${otherMembers.map((m: any) => m.user.name).join(", ")}`;

    return {
      id: conversationData.id,
      name: displayName,
      description: `Conversation with ${conversationData.members.length} members`,
      isPrivate: true,
      memberCount: conversationData.members.length,
    };
  };

  const handleRefreshData = useCallback(async () => {
    try {
      await refetchMessages();
    } catch (error) {
      console.error("Failed to refresh channel data:", error);
    }
  }, [refetchMessages]);

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
          {error ? "Failed to load conversation" : "Conversation not found"}
        </span>
      </div>
    );
  }

  const allMessages =
    conversationWithMessages?.pages.flatMap((page) => page?.messages || []) ||
    [];

  const sortedMessages = [...allMessages].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Transform data for chat component
  const conversationChannel = transformConversation(
    conversationWithMessages?.pages?.[0]
  );
  const messages = transformMessages(sortedMessages || [], currentUser);

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

  // Handle conversation details toggle
  const handleToggleConversationDetails = () => {
    // Replace with your conversation details logic
    console.log("Toggle conversation details");
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
        isLoading={false}
        workspaceId={workspaceId}
        onSendMessage={handleSendMessage}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        onReplyToMessage={handleReplyToMessage}
        onReactToMessage={handleReactToMessage}
        onToggleChannelDetails={handleToggleConversationDetails}
        onLoadMore={handleLoadMore}
        hasMoreMessages={hasNextPage}
        isLoadingMore={isFetchingNextPage}
      />
    </div>
  );
};

export default ConversationChat;
