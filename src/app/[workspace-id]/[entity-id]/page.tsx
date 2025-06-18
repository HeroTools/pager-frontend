"use client";

import ConversationChat from "@/components/chat/conversation-chat";
import ChannelChat from "@/components/chat/channel-chat";
import { useParamIds } from "@/hooks/use-param-ids";
import { AlertTriangle } from "lucide-react";

const ConversationPage = () => {
  const { type, id } = useParamIds();
  console.log(type, id);
  if (type === "conversation") {
    return (
      <div className="flex flex-col h-full">
        <ConversationChat />
      </div>
    );
  } else if (type === "channel") {
    return (
      <div className="flex flex-col h-full">
        <ChannelChat />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <AlertTriangle className="size-5 text-muted-foreground" />
    </div>
  );
};

export default ConversationPage;
