import { useQuery as useReactQuery } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

interface UseCreateOrGetConversationProps {
  workspaceId: Id<"workspaces">;
  memberId: Id<"members">
}

export const useCreateOrGetConversation = ({ memberId, workspaceId }: UseCreateOrGetConversationProps) => {
  const mutation = useConvexMutation(api.conversations.createOrGet);

  const createOrGetConversation = useReactQuery({
    queryKey: ["createOrGetConversation"],
    queryFn: async () => mutation({workspaceId, memberId})
  });

  return createOrGetConversation;
};
