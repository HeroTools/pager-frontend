import { useMutation as useReactQueryMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";

import { api } from "../../../../convex/_generated/api";

export const useRemoveChannel = () => {
  const mutation = useConvexMutation(api.channels.remove);

  const createChannel = useReactQueryMutation({
    mutationFn: mutation,
  });

  return createChannel;
};
