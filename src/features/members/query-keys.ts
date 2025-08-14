export const membersQueryKeys = {
  members: (workspaceId: string) => ['members', workspaceId] as const,
  currentMember: (workspaceId: string) => ['currentMember', workspaceId] as const,
};
