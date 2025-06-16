import { useQueryState } from "nuqs";

export const useParentMessageId = () => {
  return useQueryState("parentMessageId");
};
