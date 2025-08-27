import { McpConnectionFilters } from './types';

export const mcpQueryKeys = {
  all: ['mcp'] as const,
  connections: (workspaceId: string, filters?: McpConnectionFilters) =>
    [...mcpQueryKeys.all, 'connections', workspaceId, filters] as const,
  connection: (workspaceId: string, connectionId: string) =>
    [...mcpQueryKeys.all, 'connection', workspaceId, connectionId] as const,
  agentAccess: (workspaceId: string, agentId: string) =>
    [...mcpQueryKeys.all, 'agent-access', workspaceId, agentId] as const,
};
