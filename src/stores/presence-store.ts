import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface UserPresence {
  userId: string;
  workspaceMemberId: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: string;
  currentChannelId?: string;
  currentConversationId?: string;
}

interface PresenceState {
  presences: Map<string, UserPresence>;
  myPresence: UserPresence | null;
  setPresence: (userId: string, presence: UserPresence) => void;
  setPresences: (presences: UserPresence[]) => void;
  removePresence: (userId: string) => void;
  setMyPresence: (presence: UserPresence) => void;
  updateMyStatus: (status: 'online' | 'away' | 'offline') => void;
  updateMyLocation: (location: { channelId?: string; conversationId?: string }) => void;
  clearPresences: () => void;
  getPresenceByWorkspaceMemberId: (workspaceMemberId: string) => UserPresence | undefined;
}

export const usePresenceStore = create<PresenceState>()(
  devtools(
    (set, get) => ({
      presences: new Map(),
      myPresence: null,

      setPresence: (userId, presence) =>
        set((state) => {
          const newPresences = new Map(state.presences);
          newPresences.set(userId, presence);
          return { presences: newPresences };
        }),

      setPresences: (presences) =>
        set(() => {
          const newPresences = new Map();
          presences.forEach((presence) => {
            // Store by userId (for Supabase compatibility)
            newPresences.set(presence.userId, presence);
          });
          return { presences: newPresences };
        }),

      removePresence: (userId) =>
        set((state) => {
          const newPresences = new Map(state.presences);
          newPresences.delete(userId);
          return { presences: newPresences };
        }),

      setMyPresence: (presence) => set(() => ({ myPresence: presence })),

      updateMyStatus: (status) =>
        set((state) => {
          if (!state.myPresence) return state;
          return {
            myPresence: {
              ...state.myPresence,
              status,
              lastSeen: new Date().toISOString(),
            },
          };
        }),

      updateMyLocation: (location) =>
        set((state) => {
          if (!state.myPresence) return state;
          return {
            myPresence: {
              ...state.myPresence,
              currentChannelId: location.channelId,
              currentConversationId: location.conversationId,
              lastSeen: new Date().toISOString(),
            },
          };
        }),

      clearPresences: () =>
        set(() => ({
          presences: new Map(),
          myPresence: null,
        })),

      getPresenceByWorkspaceMemberId: (workspaceMemberId) => {
        const state = get();
        // Search through all presences to find matching workspaceMemberId
        for (const presence of state.presences.values()) {
          if (presence && presence.workspaceMemberId === workspaceMemberId) {
            return presence;
          }
        }
        return undefined;
      },
    }),
    {
      name: 'presence-store',
    },
  ),
);
