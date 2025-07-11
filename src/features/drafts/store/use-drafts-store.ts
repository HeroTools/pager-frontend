import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Draft {
  content: string;
  type: 'channel' | 'conversation';
  updatedAt: Date;
}

interface DraftsState {
  workspaces: Record<string, Record<string, Draft>>;
  setDraft: (
    workspaceId: string,
    entityId: string,
    content: string,
    type: 'channel' | 'conversation',
  ) => void;
  clearDraft: (workspaceId: string, entityId: string) => void;
  getDraft: (workspaceId: string, entityId: string) => Draft | undefined;
  getWorkspaceDrafts: (workspaceId: string) => Record<string, Draft>;
  clearWorkspaceDrafts: (workspaceId: string) => void;
}

export const useDraftsStore = create<DraftsState>()(
  persist(
    (set, get) => ({
      workspaces: {},
      setDraft: (workspaceId, entityId, content, type) => {
        set((state) => ({
          workspaces: {
            ...state.workspaces,
            [workspaceId]: {
              ...(state.workspaces[workspaceId] || {}),
              [entityId]: { content, type, updatedAt: new Date() },
            },
          },
        }));
      },
      clearDraft: (workspaceId, entityId) => {
        set((state) => {
          const newWorkspaceDrafts = { ...(state.workspaces[workspaceId] || {}) };
          delete newWorkspaceDrafts[entityId];
          return {
            workspaces: {
              ...state.workspaces,
              [workspaceId]: newWorkspaceDrafts,
            },
          };
        });
      },
      getDraft: (workspaceId, entityId) => {
        return get().workspaces[workspaceId]?.[entityId];
      },
      getWorkspaceDrafts: (workspaceId: string) => {
        return get().workspaces[workspaceId] || {};
      },
      clearWorkspaceDrafts: (workspaceId: string) => {
        set((state) => {
          const newWorkspaces = { ...state.workspaces };
          delete newWorkspaces[workspaceId];
          return { workspaces: newWorkspaces };
        });
      },
    }),
    {
      name: 'message-drafts-by-workspace',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
