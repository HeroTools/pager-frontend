import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface Draft {
  content: string;
  text: string;
  type: 'channel' | 'conversation';
  updatedAt: Date;
  entityId: string;
  parentMessageId?: string;
  parentAuthorName?: string;
}

interface DraftsState {
  workspaces: Record<string, Record<string, Draft>>;
  setDraft: (
    workspaceId: string,
    entityId: string,
    content: string,
    text: string,
    type: 'channel' | 'conversation',
    parentMessageId?: string,
    parentAuthorName?: string,
  ) => void;
  clearDraft: (workspaceId: string, entityId: string, parentMessageId?: string) => void;
  getDraft: (workspaceId: string, entityId: string, parentMessageId?: string) => Draft | undefined;
  getWorkspaceDrafts: (workspaceId: string) => Draft[];
  clearWorkspaceDrafts: (workspaceId: string) => void;
}

const createDraftKey = (entityId: string, parentMessageId?: string): string => {
  return parentMessageId ? `${entityId}::${parentMessageId}` : entityId;
};

export const useDraftsStore = create<DraftsState>()(
  persist(
    (set, get) => ({
      workspaces: {},
      setDraft: (workspaceId, entityId, content, text, type, parentMessageId, parentAuthorName) => {
        const draftKey = createDraftKey(entityId, parentMessageId);
        set((state) => ({
          workspaces: {
            ...state.workspaces,
            [workspaceId]: {
              ...(state.workspaces[workspaceId] || {}),
              [draftKey]: {
                content,
                text,
                type,
                updatedAt: new Date(),
                entityId,
                parentMessageId,
                parentAuthorName,
              },
            },
          },
        }));
      },
      clearDraft: (workspaceId, entityId, parentMessageId) => {
        const draftKey = createDraftKey(entityId, parentMessageId);
        set((state) => {
          const newWorkspaceDrafts = { ...(state.workspaces[workspaceId] || {}) };
          delete newWorkspaceDrafts[draftKey];
          return {
            workspaces: {
              ...state.workspaces,
              [workspaceId]: newWorkspaceDrafts,
            },
          };
        });
      },
      getDraft: (workspaceId, entityId, parentMessageId) => {
        const draftKey = createDraftKey(entityId, parentMessageId);
        return get().workspaces[workspaceId]?.[draftKey];
      },
      getWorkspaceDrafts: (workspaceId: string) => {
        const draftsMap = get().workspaces[workspaceId] || {};
        return Object.values(draftsMap).sort((a, b) => {
          const timeB = new Date(b.updatedAt).getTime();
          const timeA = new Date(a.updatedAt).getTime();
          return timeB - timeA;
        });
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
