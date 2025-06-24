"use client";

import { AlertTriangle, Loader } from "lucide-react";
import { useMemo } from "react";
import { Chat } from "@/components/chat/chat";
import {
  useGetChannel,
  useGetChannelWithMessagesInfinite,
  useRealtimeChannel,
  useGetChannelMembers,
} from "@/features/channels";
import { useGetMembers } from "@/features/members";
import { useMessageOperations } from "@/features/messages";
import { useCurrentUser } from "@/features/auth";
import { Message, User, Channel } from "@/types/chat";
import { useParamIds } from "@/hooks/use-param-ids";
import { UploadedAttachment } from "@/features/file-upload/types";
import { WorkspaceMember } from "@/types/database";
import { ChannelMemberData } from "@/features/channels/types";

const ChannelChat = () => {
  const { id: channelId, workspaceId } = useParamIds();
  const { user: currentUser, isAuthenticated } = useCurrentUser();

  // Fetch messages and members using infinite query
  const {
    data: channelWithMessages,
    isLoading: isLoadingMessages,
    error: messagesError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetChannelWithMessagesInfinite(workspaceId, channelId);

  // Fetch channel details (with cache optimization)
  const {
    data: channelDetails,
    isLoading: isLoadingChannel,
    error: channelError,
  } = useGetChannel(workspaceId, channelId);

  // Fetch channel members for header
  const {
    data: channelMembersResponse,
    isLoading: isLoadingMembers,
    error: membersError,
  } = useGetChannelMembers(workspaceId, channelId);

  // Fetch workspace members to get full user data
  const { data: workspaceMembers } = useGetMembers(workspaceId);

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

  const { createMessage, updateMessage, deleteMessage, toggleReaction } =
    useMessageOperations(workspaceId, channelId, undefined);

  const transformChannel = (channelData: any): Channel => ({
    id: channelData.id,
    name: channelData.name,
    description: channelData.description,
    isPrivate: channelData.channel_type === "private",
    memberCount: channelData.members?.length || 0,
  });

  const transformMessages = (messagesData: any[]): Message[] => {
    return messagesData.map((msg) => {
      if (!msg.user?.id) {
        console.log(msg, "msg");
      }
      return {
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
        reactions:
          msg.reactions?.map((reaction: any) => ({
            id: reaction.id,
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
        attachments: msg?.attachments || [],
      };
    });
  };

  const transformCurrentUser = (userData: any): User => ({
    id: userData.id,
    name: userData.name,
    avatar: userData.image,
    status: "online" as const,
  });


  // Transform members for header by combining channel member roles with workspace member data
  const members = useMemo(() => {
    if (!channelMembersResponse || !workspaceMembers) return [];
    
    return channelMembersResponse.map(channelMember => {
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
    }).filter((member): member is ChannelMemberData => member !== null);
  }, [channelMembersResponse, workspaceMembers]);

  // Combined loading state
  const isLoading = isLoadingMessages || isLoadingChannel || isLoadingMembers || !currentUser;
  const error = messagesError || channelError || membersError;

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
  const messages = transformMessages(sortedMessages);
  const user = transformCurrentUser(currentUser);

  // Handle message sending with real-time integration
  const handleSendMessage = async (content: {
    body: string;
    attachments: UploadedAttachment[];
  }) => {
    try {
      // Stop typing indicator immediately when sending
      // handleTypingSubmit();

      await createMessage.mutateAsync({
        body: content.body,
        attachments: content.attachments,
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
        members={members}
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
