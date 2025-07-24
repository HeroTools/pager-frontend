import { useQuery } from '@tanstack/react-query';
import { membersApi } from '../api/members-api';
import { membersQueryKeys } from '../query-keys';
import type { MemberFilters } from '../types';

// Get current user's member record for a workspace
export const useCurrentMember = (workspaceId: string) => {
  return useQuery({
    queryKey: ['currentMember', workspaceId],
    queryFn: () => membersApi.getCurrentMember(workspaceId),
    enabled: !!workspaceId,
  });
};

// Get all members for a workspace
export const useGetMembers = (workspaceId: string, filters?: Partial<MemberFilters>) => {
  return useQuery({
    queryKey: membersQueryKeys.members(workspaceId),
    queryFn: () => membersApi.getMembers(workspaceId, filters),
    enabled: !!workspaceId,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    gcTime: 600_000,
  });
};
