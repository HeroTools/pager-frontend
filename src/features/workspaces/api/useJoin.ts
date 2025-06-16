import { useMutation as useReactQueryMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";

import { api } from "../../../../convex/_generated/api";

export const useJoin = () => {
  const mutation = useConvexMutation(api.workspaces.join);

  const newJoinCode = useReactQueryMutation({
    mutationFn: mutation,
  });

  return newJoinCode;
};
