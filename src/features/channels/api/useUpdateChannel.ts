import { useMutation as useReactQueryMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";

import { api } from "../../../../convex/_generated/api";

export const useUpdateChannel = () => {
  const mutation = useConvexMutation(api.channels.update);

  const createChannel = useReactQueryMutation({
    mutationFn: mutation,
  });

  return createChannel;
};
