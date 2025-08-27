import axiosClient from '@/lib/api/axios-client';

export const mcpApprovalApi = {
  // Approve an MCP tool call
  async approveTool(approvalId: string): Promise<void> {
    await axiosClient.post(`/mcp/approvals/${approvalId}/approve`);
  },

  // Deny an MCP tool call
  async denyTool(approvalId: string, reason?: string): Promise<void> {
    await axiosClient.post(`/mcp/approvals/${approvalId}/deny`, { reason });
  },

  // Get pending approvals for a user (for admin dashboards)
  async getPendingApprovals(workspaceId: string): Promise<any[]> {
    const response = await axiosClient.get(`/mcp/approvals/${workspaceId}/pending`);
    return response.data;
  },
};
