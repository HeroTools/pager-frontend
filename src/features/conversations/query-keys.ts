export const conversationsQueryKeys = {
  conversations: (workspaceId: string) => ['conversations', workspaceId] as const,
  conversation: (workspaceId: string, conversationId: string) =>
    ['conversation', workspaceId, conversationId] as const,
};
