import { useMutation as useReactQueryMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";

import { api } from "../../../../convex/_generated/api";

export const useUpdateMessage = () => {
  const mutation = useConvexMutation(api.messages.update);

  const createMessage = useReactQueryMutation({
    mutationFn: mutation,
  });

  return createMessage;
};
