import { useQuery } from '@tanstack/react-query';
import { membersApi } from './members-api';

interface UseCurrentMemberParams {
  workspaceId: string;
}

export const useCurrentMember = ({ workspaceId }: UseCurrentMemberParams) => {
  return useQuery({
    queryKey: ['currentMember', workspaceId],
    queryFn: () => membersApi.getCurrentMember(workspaceId),
    enabled: !!workspaceId,
  });
}; 