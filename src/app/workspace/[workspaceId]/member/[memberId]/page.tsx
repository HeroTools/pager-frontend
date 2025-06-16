"use client";

import { AlertTriangle, Loader } from "lucide-react";

import { useCreateOrGetConversation } from "@/features/conversation/api/useCreateOrGetConversation";
import { useMemberId } from "@/hooks/useMemberId";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { Conversation } from "./Conversation";

const MemberIdPage = () => {
  const workspaceId = useWorkspaceId();
  const memberId = useMemberId();

  const createOrGetConversation = useCreateOrGetConversation({
    memberId,workspaceId
  });

  if (createOrGetConversation.isPending) {
    return (
      <div className="h-full flex-1 flex items-center justify-center">
        <Loader className="animate-spin size-5 text-muted-foreground" />
      </div>
    );
  }

  if (!createOrGetConversation.data) {
    return (
      <div className="h-full flex-1 flex items-center justify-center">
        <AlertTriangle className="size-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Conversation not found
        </span>
      </div>
    );
  }

  return <Conversation id={createOrGetConversation.data} />;
};

export default MemberIdPage;
