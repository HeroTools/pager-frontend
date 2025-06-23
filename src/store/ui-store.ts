import { MessageWithUser } from "@/features/messages/types";
import { create } from "zustand";

interface UIState {
  openEmojiPickerMessageId: string | null;
  setEmojiPickerOpen: (messageId: string | null) => void;
  isEmojiPickerOpen: () => boolean;
  openThreadMessageId: string | null;
  setThreadOpen: (message: MessageWithUser | null) => void;
  selectedThreadParentMessage: MessageWithUser | null;
  setSelectedThreadParentMessage: (message: MessageWithUser | null) => void;
  isThreadOpen: () => boolean;
}

export const useUIStore = create<UIState>((set, get) => ({
  openEmojiPickerMessageId: null,
  setEmojiPickerOpen: (messageId) =>
    set({ openEmojiPickerMessageId: messageId }),
  isEmojiPickerOpen: () => get().openEmojiPickerMessageId !== null,
  openThreadMessageId: null,
  setThreadOpen: (message) => {
    console.log(message);
    set({ openThreadMessageId: message?.id });
    set({ selectedThreadParentMessage: message });
  },
  selectedThreadParentMessage: null,
  setSelectedThreadParentMessage: (message) =>
    set({ selectedThreadParentMessage: message }),
  isThreadOpen: () => get().openThreadMessageId !== null,
}));
