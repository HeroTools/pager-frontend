export const workspacesQueryKeys = {
  workspaces: () => ['workspaces'] as const,
  workspace: (id: string) => ['workspace', id] as const,
};
