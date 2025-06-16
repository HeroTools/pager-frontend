"use client";

import { AlertTriangle, Loader } from "lucide-react";

import { MessageList } from "@/components/MessageList";
import { useGetChannel } from "@/features/channels/api/useChannels";
import { useGetMessages } from "@/features/messages/api/useMessages";
import { useChannelId } from "@/hooks/useChannelId";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { ChatInput } from "./ChatInput";
import { Header } from "./Header";

const ChannelPage = () => {
  const channelId = useChannelId() as string;
  const workspaceId = useWorkspaceId() as string;

  const getChannel = useGetChannel(workspaceId, channelId);
  const getMessages = useGetMessages(channelId);

  if (getChannel.isLoading || getMessages.isLoading) {
    return (
      <div className="h-full flex-1 flex items-center justify-center">
        <Loader className="animate-spin size-5 text-muted-foreground" />
      </div>
    );
  }

  if (!getChannel.data) {
    return (
      <div className="h-full flex-1 flex flex-col gap-y-2 items-center justify-center">
        <AlertTriangle className="size-5 text-muted-foreground" />
        <span className="text-muted-foreground text-sm">Channel not found</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title={getChannel.data.name} />
      <MessageList
        channelName={getChannel.data.name}
        channelCreationTime={new Date(getChannel.data.createdAt).getTime()}
        data={getMessages.data?.messages || []}
        loadMore={() => {}}
        isLoadingMore={getMessages.isFetching}
        canLoadMore={getMessages.data?.hasMore || false}
      />
      <ChatInput placeholder={`Message # ${getChannel.data.name}`} />
    </div>
  );
};

export default ChannelPage;
