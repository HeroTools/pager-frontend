import { Loader } from "lucide-react";

import { MessageList } from "@/components/MessageList";
import { useGetMember } from "@/features/members/api/useGetMember";
import { useGetMessages } from "@/features/messages/api/useGetMessages";
import { useMemberId } from "@/hooks/useMemberId";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { ChatInput } from "./ChatInput";
import { Header } from "./Header";
import { usePanel } from "@/hooks/usePanel";

interface ConversationProps {
  id: Id<"conversations">;
}

export const Conversation = ({ id }: ConversationProps) => {
  const memberId = useMemberId();
  const getMember = useGetMember({ id: memberId });
  const getMessages = useGetMessages({
    conversationId: id,
  });
  const { openProfile } = usePanel();

  if (getMember.isLoading || getMessages.status === "LoadingFirstPage") {
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
