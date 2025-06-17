"use client";

import { AlertTriangle, Loader } from "lucide-react";
import { useParams } from "next/navigation";

import { Chat } from "@/components/chat/chat";
import { useGetChannel } from "@/features/channels/hooks/use-channels-mutations";
import { useGetChannelMessages } from "@/features/messages/hooks/use-messages";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { Message, User, Channel } from "@/types/chat";

const ConversationPage = () => {
  const params = useParams();
  const workspaceId = params.workspace_id as string;
  const conversationId = (params.conversation_id as string).slice(2);

  const { user: currentUser } = useCurrentUser();

  const getChannel = useGetChannel(workspaceId, conversationId);
  const getMessages = useGetChannelMessages(workspaceId, conversationId);

  const transformChannel = (channelData: any): Channel => ({
    id: channelData.id,
    name: channelData.name,
    description: channelData.description,
    isPrivate: channelData.type === "private",
    memberCount: channelData.memberCount,
  });

  const transformMessages = (messagesData: any[]): Message[] => {
    return messagesData.map((msg) => ({
      id: msg.id,
      content: msg.body || msg.content,
      authorId: msg.userId || msg.authorId,
      author: {
        id: msg.user?.id || msg.author?.id,
        name: msg.user?.name || msg.author?.name,
        avatar: msg.user?.image || msg.author?.avatar,
        status: "online" as const,
      },
      timestamp: new Date(msg.createdAt || msg.timestamp),
      image: msg.image,
      reactions: msg.reactions || [],
      threadCount: msg.threadCount,
      isEdited: msg.isEdited || false,
    }));
  };

  const transformCurrentUser = (userData: any): User => ({
    id: userData.id,
    name: userData.name,
    avatar: userData.image,
    status: "online" as const,
  });

  if (getChannel.isLoading || getMessages.isLoading || !currentUser) {
    return (
      <div className="h-full flex-1 flex items-center justify-center">
        <Loader className="animate-spin size-5 text-muted-foreground" />
      </div>
    );
  }

  // Handle error states
  if (!getChannel.data) {
    return (
      <div className="h-full flex-1 flex flex-col gap-y-2 items-center justify-center">
        <AlertTriangle className="size-5 text-muted-foreground" />
        <span className="text-muted-foreground text-sm">
          Conversation not found
        </span>
      </div>
    );
  }

  // Transform data for chat component
  const channel = transformChannel(getChannel.data);
  const messages = transformMessages(getMessages.data?.messages || []);
  const user = transformCurrentUser(currentUser);

  // Handle message sending
  const handleSendMessage = async (content: {
    body: string;
    image: File | null;
  }) => {
    try {
      // Replace this with your actual message sending logic
      // Example API call:
      // await sendMessage({
      //   workspaceId,
      //   channelId: conversationId,
      //   body: content.body,
      //   image: content.image,
      // });

      console.log("Sending message:", content);

      // Trigger refetch of messages
      getMessages.refetch?.();
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  // Handle message editing
  const handleEditMessage = async (messageId: string) => {
    try {
      // Replace with your edit message logic
      console.log("Editing message:", messageId);
    } catch (error) {
      console.error("Failed to edit message:", error);
    }
  };

  // Handle message deletion
  const handleDeleteMessage = async (messageId: string) => {
    try {
      // Replace with your delete message logic
      console.log("Deleting message:", messageId);

      // Trigger refetch of messages
      getMessages.refetch?.();
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  // Handle message reactions
  const handleReactToMessage = async (messageId: string, emoji: string) => {
    try {
      // Replace with your reaction logic
      console.log("Reacting to message:", messageId, emoji);

      // Trigger refetch of messages
      getMessages.refetch?.();
    } catch (error) {
      console.error("Failed to react to message:", error);
    }
  };

  // Handle replies/threads
  const handleReplyToMessage = async (messageId: string) => {
    try {
      // Replace with your thread/reply logic
      console.log("Replying to message:", messageId);
    } catch (error) {
      console.error("Failed to reply to message:", error);
    }
  };

  // Handle channel details toggle
  const handleToggleChannelDetails = () => {
    // Replace with your channel details logic
    console.log("Toggle channel details");
  };

  return (
    <div className="flex flex-col h-full">
      <Chat
        channel={channel}
        messages={messages}
        currentUser={user}
        isLoading={getMessages.isFetching}
        onSendMessage={handleSendMessage}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        onReplyToMessage={handleReplyToMessage}
        onReactToMessage={handleReactToMessage}
        onToggleChannelDetails={handleToggleChannelDetails}
      />
    </div>
  );
};

export default ConversationPage;
