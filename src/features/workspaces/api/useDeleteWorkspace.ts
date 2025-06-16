import { useMutation as useReactQueryMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";

import { api } from "../../../../convex/_generated/api";

export const useRemoveWorkspace = () => {
  const mutation = useConvexMutation(api.workspaces.remove);

  const updateWorkspace = useReactQueryMutation({
    mutationFn: mutation,
  });

  return updateWorkspace;
};
