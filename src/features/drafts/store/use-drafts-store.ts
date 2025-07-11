import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Draft {
  content: string;
  type: 'channel' | 'conversation';
  updatedAt: Date;
}

interface DraftsState {
  drafts: Record<string, Draft>;
  setDraft: (entityId: string, content: string, type: 'channel' | 'conversation') => void;
  clearDraft: (entityId: string) => void;
  getDraft: (entityId: string) => Draft | undefined;
}

export const useDraftsStore = create<DraftsState>()(
  persist(
    (set, get) => ({
      drafts: {},
      setDraft: (entityId, content, type) => {
        set((state) => ({
          drafts: {
            ...state.drafts,
            [entityId]: { content, type, updatedAt: new Date() },
          },
        }));
      },
      clearDraft: (entityId: string) => {
        set((state) => {
          const newDrafts = { ...state.drafts };
          delete newDrafts[entityId];
          return { drafts: newDrafts };
        });
      },
      getDraft: (entityId) => {
        return get().drafts[entityId];
      },
    }),
    {
      name: 'message-drafts',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
