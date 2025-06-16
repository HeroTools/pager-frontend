import { useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

interface useGetMembersProps {
  id: Id<"members">;
}

export const useGetMember = ({ id }: useGetMembersProps) => {
  const data = useQuery(api.members.getById, { id });
  const isLoading = data === undefined;

  return {
    data,
    isLoading,
  };
};
