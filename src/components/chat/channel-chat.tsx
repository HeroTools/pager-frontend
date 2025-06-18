"use client";

import { AlertTriangle, Loader } from "lucide-react";

import { Chat } from "@/components/chat/chat";
import {
  useGetChannel,
  useGetChannelWithMessages,
} from "@/features/channels/hooks/use-channels-mutations";
import { useMessageOperations } from "@/features/messages/hooks/use-messages";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { Message, User, Channel } from "@/types/chat";
import { useParamIds } from "@/hooks/use-param-ids";

const ChannelChat = () => {
  const { id: channelId, workspaceId } = useParamIds();

  const { user: currentUser } = useCurrentUser();

  // Fetch messages and members
  const {
    data: channelWithMessages,
    isLoading: isLoadingMessages,
    error: messagesError,
    refetch,
  } = useGetChannelWithMessages(workspaceId, channelId);

  // Fetch channel details (with cache optimization)
  const {
    data: channelDetails,
    isLoading: isLoadingChannel,
    error: channelError,
  } = useGetChannel(workspaceId, channelId);

  // Message operation hooks
  const {
    createMessage,
    updateMessage,
    deleteMessage,
    addReaction,
    removeReaction,
  } = useMessageOperations(workspaceId, channelId, undefined);

  const transformChannel = (channelData: any): Channel => ({
    id: channelData.id,
    name: channelData.name,
    description: channelData.description,
    isPrivate: channelData.channel_type === "private",
    memberCount: channelData.members?.length || 0,
  });

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
        msg.reactions?.map((reaction) => ({
          emoji: reaction.value,
          count: reaction.count,
          users: reaction.users,
          hasReacted: reaction.users.some(
            (user: any) => user.id === currentUser?.id
          ),
        })) || [],
      threadCount: 0, // You might want to add thread count to your schema
      isEdited: !!msg.edited_at,
    }));
  };

  const transformCurrentUser = (userData: any): User => ({
    id: userData.id,
    name: userData.name,
    avatar: userData.image,
    status: "online" as const,
  });

  // Combined loading state
  const isLoading = isLoadingMessages || isLoadingChannel || !currentUser;

  // Combined error state
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

  // Extract data from the responses
  const { messages: messagesData, members } = channelWithMessages;

  // Transform data for chat component
  const channel = transformChannel(channelDetails);
  const messages = transformMessages(messagesData || []);
  const user = transformCurrentUser(currentUser);

  // Handle message sending
  const handleSendMessage = async (content: {
    body: string;
    image: File | null;
  }) => {
    try {
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
      const message = messagesData.find((msg) => msg.id === messageId);
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
        isLoading={
          createMessage.isPending ||
          updateMessage.isPending ||
          deleteMessage.isPending
        }
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

export default ChannelChat;
