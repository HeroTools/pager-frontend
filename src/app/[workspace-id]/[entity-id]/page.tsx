"use client";

import ConversationChat from "@/components/conversation-chat";
import ChannelChat from "@/components/channel-chat";
import { useParams } from "next/navigation";

const ConversationPage = () => {
  const params = useParams();
  const entityId = params["entity-id"] as string;

  const firstLetter = entityId.charAt(0).toUpperCase();
  if (firstLetter === "D") {
    return (
      <div className="flex flex-col h-full">
        <ConversationChat />
      </div>
    );
  } else {
    return (
      <div className="flex flex-col h-full">
        <ChannelChat />
      </div>
    );
  }
};

export default ConversationPage;
