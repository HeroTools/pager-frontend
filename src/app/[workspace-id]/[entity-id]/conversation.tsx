import { Loader } from "lucide-react";

import { MessageList } from "@/features/conversations/components/message-list";
import { useGetMember } from "@/features/members/hooks/use-members";
import { useGetChannelMessages } from "@/features/messages/hooks/use-messages";
import { useMemberId } from "@/hooks/use-member-id";
import { ChatInput } from "./chat-input";
import { Header } from "./header";
import { usePanel } from "@/hooks/use-panel";
import { useWorkspaceId } from "@/hooks/use-workspace-id";

export const Conversation = (id: string) => {
  const workspaceId = useWorkspaceId();
  const getMessages = useGetChannelMessages(workspaceId, id);
  const { openProfile } = usePanel();

  if (getMessages.status === "LoadingFirstPage") {
    return (
      <div className="h-full flex-1 flex items-center justify-center">
        <Loader className="animate-spin size-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        memberName={getMember.data?.user.name}
        memberImage={getMember.data?.user.image}
        onClick={() => openProfile(memberId)}
      />
      <MessageList
        variant="conversation"
        memberName={getMember.data?.user.name}
        memberImage={getMember.data?.user.image}
        data={getMessages.results}
        loadMore={getMessages.loadMore}
        isLoadingMore={getMessages.status === "LoadingMore"}
        canLoadMore={getMessages.status === "CanLoadMore"}
      />
      <ChatInput
        placeholder={`Message ${getMember.data?.user.name}`}
        conversationId={id}
      />
    </div>
  );
};
