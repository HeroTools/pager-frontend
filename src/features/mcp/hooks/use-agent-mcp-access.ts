import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { mcpApi } from '../api/mcp-api';
import { mcpQueryKeys } from '../query-keys';
import { UpdateAgentMcpAccessRequest } from '../types';

export function useAgentMcpAccess(workspaceId: string, agentId: string) {
  return useQuery({
    queryKey: mcpQueryKeys.agentAccess(workspaceId, agentId),
    queryFn: () => mcpApi.getAgentMcpAccess(workspaceId, agentId),
    enabled: !!workspaceId && !!agentId,
  });
}

export function useUpdateAgentMcpAccess(workspaceId: string, agentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateAgentMcpAccessRequest) =>
      mcpApi.updateAgentMcpAccess(workspaceId, agentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: mcpQueryKeys.agentAccess(workspaceId, agentId),
      });
      toast.success('Agent MCP access updated successfully');
    },
    onError: (error: any) => {
      console.error('Error updating agent MCP access:', error);
      toast.error(error.response?.data?.message || 'Failed to update agent MCP access');
    },
  });
}
