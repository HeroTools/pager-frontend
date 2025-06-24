import { create } from "zustand";

interface PendingMessage {
  optimisticId: string;
  workspaceId: string;
  channelId?: string;
  conversationId?: string;
  entityId?: string;
  entityType?: string;
  timestamp: number;
}

interface MessagesStoreState {
  pendingMessages: Map<string, PendingMessage>;
  addPendingMessage: (
    optimisticId: string,
    details: Omit<PendingMessage, "optimisticId" | "timestamp">
  ) => void;
  removePendingMessage: (optimisticId: string) => void;
  isMessagePending: (optimisticId: string) => boolean;
  getPendingMessage: (optimisticId: string) => PendingMessage | undefined;
}

export const useMessagesStore = create<MessagesStoreState>((set, get) => ({
  pendingMessages: new Map(),

  addPendingMessage: (optimisticId, details) => {
    set((state) => {
      const newMap = new Map(state.pendingMessages);
      newMap.set(optimisticId, {
        optimisticId,
        ...details,
        timestamp: Date.now(),
      });
      return { pendingMessages: newMap };
    });
  },

  removePendingMessage: (optimisticId) => {
    set((state) => {
      const newMap = new Map(state.pendingMessages);
      newMap.delete(optimisticId);
      return { pendingMessages: newMap };
    });
  },

  isMessagePending: (optimisticId) => {
    return get().pendingMessages.has(optimisticId);
  },

  getPendingMessage: (optimisticId) => {
    return get().pendingMessages.get(optimisticId);
  },
}));
