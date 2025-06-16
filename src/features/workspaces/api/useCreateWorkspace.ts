import { useMutation as useReactQueryMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";

import { api } from "../../../../convex/_generated/api";

export const useCreateWorkspace = () => {
  const mutation = useConvexMutation(api.workspaces.create);

  const createWorkspace = useReactQueryMutation({
    mutationFn: mutation,
  });

  return createWorkspace;
};
