import { create } from 'zustand';

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
  clearPresences: () => void;
  getPresenceByWorkspaceMemberId: (workspaceMemberId: string) => UserPresence | undefined;
}

export const usePresenceStore = create<PresenceState>()((set, get) => ({
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

  clearPresences: () =>
    set(() => ({
      presences: new Map(),
      myPresence: null,
    })),

  getPresenceByWorkspaceMemberId: (workspaceMemberId) => {
    if (!workspaceMemberId) return undefined;

    const state = get();
    // Use Array.from for better performance with large Maps
    return Array.from(state.presences.values()).find(
      (presence) => presence?.workspaceMemberId === workspaceMemberId,
    );
  },
}));
