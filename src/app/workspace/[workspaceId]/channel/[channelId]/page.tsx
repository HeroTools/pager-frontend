"use client";

import { AlertTriangle, Loader } from "lucide-react";

import { MessageList } from "@/components/MessageList";
import { useGetChannel } from "@/features/channels/api/useGetChannel";
import { useGetMessages } from "@/features/messages/api/useGetMessages";
import { useChannelId } from "@/hooks/useChannelId";
import { ChatInput } from "./ChatInput";
import { Header } from "./Header";

const ChannelPage = () => {
  const channelId = useChannelId();

  const getChannel = useGetChannel({ id: channelId });
  const getMessages = useGetMessages({ channelId });

  if (getChannel.isLoading || getMessages.status === "LoadingFirstPage") {
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
        channelCreationTime={getChannel.data._creationTime}
        data={getMessages.results}
        loadMore={getMessages.loadMore}
        isLoadingMore={getMessages.status === "LoadingMore"}
        canLoadMore={getMessages.status === "CanLoadMore"}
      />
      <ChatInput placeholder={`Message # ${getChannel.data.name}`} />
    </div>
  );
};

export default ChannelPage;
