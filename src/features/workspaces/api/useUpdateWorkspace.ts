import { useMutation as useReactQueryMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";

import { api } from "../../../../convex/_generated/api";

export const useUpdateWorkspace = () => {
  const mutation = useConvexMutation(api.workspaces.update);

  const updateWorkspace = useReactQueryMutation({
    mutationFn: mutation,
  });

  return updateWorkspace;
};
