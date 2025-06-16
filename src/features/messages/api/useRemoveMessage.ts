import { useMutation as useReactQueryMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";

import { api } from "../../../../convex/_generated/api";

export const useRemoveMessage = () => {
  const mutation = useConvexMutation(api.messages.remove);

  const createMessage = useReactQueryMutation({
    mutationFn: mutation,
  });

  return createMessage;
};
