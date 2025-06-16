import { useMutation as useReactQueryMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";

import { api } from "../../../../convex/_generated/api";

export const useCreateMessage = () => {
  const mutation = useConvexMutation(api.messages.create);

  const createMessage = useReactQueryMutation({
    mutationFn: mutation,
  });

  return createMessage;
};
