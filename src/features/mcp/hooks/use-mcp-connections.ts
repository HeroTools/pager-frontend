import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { mcpApi } from '../api/mcp-api';
import { mcpQueryKeys } from '../query-keys';
import {
  CreateMcpConnectionRequest,
  UpdateMcpConnectionRequest,
  McpConnectionFilters,
} from '../types';

export function useMcpConnections(workspaceId: string, filters?: McpConnectionFilters) {
  return useQuery({
    queryKey: mcpQueryKeys.connections(workspaceId, filters),
    queryFn: () => mcpApi.getConnections(workspaceId, filters),
    enabled: !!workspaceId,
  });
}

export function useCreateMcpConnection(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMcpConnectionRequest) => mcpApi.createConnection(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpQueryKeys.connections(workspaceId) });
      toast.success('MCP connection created successfully');
    },
    onError: (error: any) => {
      console.error('Error creating MCP connection:', error);
      toast.error(error.response?.data?.message || 'Failed to create MCP connection');
    },
  });
}

export function useUpdateMcpConnection(workspaceId: string, connectionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateMcpConnectionRequest) =>
      mcpApi.updateConnection(workspaceId, connectionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpQueryKeys.connections(workspaceId) });
      toast.success('MCP connection updated successfully');
    },
    onError: (error: any) => {
      console.error('Error updating MCP connection:', error);
      toast.error(error.response?.data?.message || 'Failed to update MCP connection');
    },
  });
}

export function useDeleteMcpConnection(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectionId: string) => mcpApi.deleteConnection(workspaceId, connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpQueryKeys.connections(workspaceId) });
      toast.success('MCP connection deleted successfully');
    },
    onError: (error: any) => {
      console.error('Error deleting MCP connection:', error);
      toast.error(error.response?.data?.message || 'Failed to delete MCP connection');
    },
  });
}

export function useTestMcpConnection(workspaceId: string) {
  return useMutation({
    mutationFn: (connectionId: string) => mcpApi.testConnection(workspaceId, connectionId),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Connection test successful! Found ${result.tools?.length || 0} tools.`);
      } else {
        toast.error(`Connection test failed: ${result.error}`);
      }
    },
    onError: (error: any) => {
      console.error('Error testing MCP connection:', error);
      toast.error(error.response?.data?.message || 'Failed to test MCP connection');
    },
  });
}
