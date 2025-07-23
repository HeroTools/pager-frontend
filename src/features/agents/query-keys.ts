export const agentsQueryKeys = {
  agentMessages(workspaceId: string, conversationId: string) {
    return ['agent-messages', workspaceId, conversationId];
  },
  agents(workspaceId: string) {
    return ['agents', workspaceId];
  },
};
