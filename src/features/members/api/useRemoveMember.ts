import { useMutation as useReactQueryMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";

import { api } from "../../../../convex/_generated/api";

export const useRemoveMember = () => {
  const mutation = useConvexMutation(api.members.remove);

  const removeMember = useReactQueryMutation({
    mutationFn: mutation,
  });

  return removeMember;
};
