import { useMutation as useReactQueryMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";

import { api } from "../../../../convex/_generated/api";

export const useToggleReaction = () => {
  const mutation = useConvexMutation(api.reactions.toggle);

  const toggleReaction = useReactQueryMutation({
    mutationFn: mutation,
  });

  return toggleReaction;
};
