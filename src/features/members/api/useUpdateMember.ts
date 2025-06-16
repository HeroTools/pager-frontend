import { useMutation as useReactQueryMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";

import { api } from "../../../../convex/_generated/api";

export const useUpdateMember = () => {
  const mutation = useConvexMutation(api.members.update);

  const updateMember = useReactQueryMutation({
    mutationFn: mutation,
  });

  return updateMember;
};
