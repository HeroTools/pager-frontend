"use client";

import { AlertTriangle, Loader } from "lucide-react";

import { Chat } from "@/components/chat/chat";
import {
  useGetConversationWithMessagesInfinite,
  useRealtimeConversation,
} from "@/features/conversations";
import { useMessageOperations } from "@/features/messages/hooks/use-messages";
import { useCurrentUser } from "@/features/auth";
import { Message, User, Channel } from "@/types/chat";
import { useParamIds } from "@/hooks/use-param-ids";

const ConversationChat = () => {
  const { id: conversationId, workspaceId } = useParamIds();

  const { user: currentUser } = useCurrentUser();

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
    enabled: !!currentUser?.id && !!conversationId && !!workspaceId,
  });

  // Message operation hooks
  const {
    createMessage,
    updateMessage,
    deleteMessage,
    addReaction,
    removeReaction,
  } = useMessageOperations(workspaceId, undefined, conversationId);

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

  const transformMessages = (messagesData: any[]): Message[] => {
    return messagesData.map((msg) => ({
      id: msg.id,
      content: msg.body,
      authorId: msg.user.id,
      author: {
        id: msg.user.id,
        name: msg.user.name,
        avatar: msg.user.image,
        status: "online" as const,
      },
      timestamp: new Date(msg.created_at),
      image: msg.attachment?.url,
      reactions:
        msg.reactions?.map((reaction: any) => ({
          emoji: reaction.value,
          count: reaction.count,
          users: reaction.users,
          hasReacted: reaction.users.some(
            (user: any) => user.id === currentUser?.id
          ),
        })) || [],
      threadCount: 0,
      isEdited: !!msg.edited_at,
      isOptimistic: msg._isOptimistic || false,
    }));
  };

  const transformCurrentUser = (userData: any): User => ({
    id: userData.id,
    name: userData.name,
    avatar: userData.image,
    status: "online" as const,
  });

  const isLoading = isLoadingMessages || !currentUser;
  const error = messagesError;

  if (isLoading || !currentUser) {
    return (
      <div className="h-full flex-1 flex items-center justify-center">
        <Loader className="animate-spin size-5 text-muted-foreground" />
      </div>
    );
  }

  console.log("conversationWithMessages", conversationWithMessages);
  console.log("messagesError", messagesError);

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
  const messages = transformMessages(sortedMessages || []);
  const user = transformCurrentUser(currentUser);

  // Handle message sending with real-time integration
  const handleSendMessage = async (content: {
    body: string;
    image: File | null;
  }) => {
    try {
      // Stop typing indicator immediately when sending
      // handleTypingSubmit();

      // Handle file upload first if there's an image
      let attachment_id: string | undefined;

      if (content.image) {
        // TODO: Implement file upload logic
        // const uploadResult = await uploadFile(content.image);
        // attachment_id = uploadResult.id;
        console.log("File upload not implemented yet");
      }

      await createMessage.mutateAsync({
        body: content.body,
        attachment_id,
        message_type: "direct",
      });

      console.log("Message sent successfully");
    } catch (error) {
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

      if (hasReacted) {
        // Remove reaction
        await removeReaction.mutateAsync({ messageId, emoji });
        console.log("Reaction removed");
      } else {
        // Add reaction
        await addReaction.mutateAsync({ messageId, emoji });
        console.log("Reaction added");
      }
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
        currentUser={user}
        chatType="conversation"
        // typingUsers={transformedTypingUsers} // Pass typing users to Chat component
        isLoading={
          false
          // createMessage.isPending ||
          // updateMessage.isPending ||
          // deleteMessage.isPending
        }
        workspaceId={workspaceId}
        onSendMessage={handleSendMessage}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        onReplyToMessage={handleReplyToMessage}
        onReactToMessage={handleReactToMessage}
        onToggleChannelDetails={handleToggleConversationDetails}
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

export default ConversationChat;
