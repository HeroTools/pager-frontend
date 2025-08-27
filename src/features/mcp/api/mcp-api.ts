import axiosClient from '@/lib/api/axios-client';
import {
  AgentMcpAccessWithConnection,
  CreateMcpConnectionRequest,
  McpConnectionFilters,
  McpConnectionWithCreator,
  McpTestResult,
  OAuthInitiationResponse,
  UpdateAgentMcpAccessRequest,
  UpdateMcpConnectionRequest,
} from '../types';

export const mcpApi = {
  // MCP Connections CRUD
  async getConnections(
    workspaceId: string,
    filters?: McpConnectionFilters,
  ): Promise<McpConnectionWithCreator[]> {
    const params = new URLSearchParams();
    if (filters?.provider) params.append('provider', filters.provider);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.include_inactive)
      params.append('include_inactive', filters.include_inactive.toString());

    const queryString = params.toString();
    const url = `/mcp/${workspaceId}${queryString ? `?${queryString}` : ''}`;

    const response = await axiosClient.get(url);
    return response.data;
  },

  async createConnection(
    workspaceId: string,
    data: CreateMcpConnectionRequest,
  ): Promise<McpConnectionWithCreator | { connection: McpConnectionWithCreator; oauth: OAuthInitiationResponse }> {
    const response = await axiosClient.post(`/mcp/${workspaceId}`, data);
    return response.data;
  },

  async updateConnection(
    workspaceId: string,
    connectionId: string,
    data: UpdateMcpConnectionRequest,
  ): Promise<McpConnectionWithCreator> {
    const response = await axiosClient.put(`/mcp/${workspaceId}/${connectionId}`, data);
    return response.data;
  },

  async deleteConnection(workspaceId: string, connectionId: string): Promise<void> {
    await axiosClient.delete(`/mcp/${workspaceId}/${connectionId}`);
  },

  async testConnection(workspaceId: string, connectionId: string): Promise<McpTestResult> {
    const response = await axiosClient.post(`/mcp/${workspaceId}/${connectionId}/test`);
    return response.data;
  },

  async refreshToken(workspaceId: string, connectionId: string): Promise<{ message: string; expires_at: string | null }> {
    const response = await axiosClient.post(`/mcp/${workspaceId}/${connectionId}/refresh-token`);
    return response.data;
  },

  // Agent MCP Access
  async getAgentMcpAccess(
    workspaceId: string,
    agentId: string,
  ): Promise<AgentMcpAccessWithConnection[]> {
    const response = await axiosClient.get(`/agents/${workspaceId}/${agentId}/mcp-access`);
    return response.data;
  },

  async updateAgentMcpAccess(
    workspaceId: string,
    agentId: string,
    data: UpdateAgentMcpAccessRequest,
  ): Promise<AgentMcpAccessWithConnection[]> {
    const response = await axiosClient.put(`/agents/${workspaceId}/${agentId}/mcp-access`, data);
    return response.data;
  },
};
