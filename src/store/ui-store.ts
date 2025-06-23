import { create } from "zustand";

interface UIState {
  openEmojiPickerMessageId: string | null;
  setEmojiPickerOpen: (messageId: string | null) => void;
  isEmojiPickerOpen: () => boolean;
}

export const useUIStore = create<UIState>((set, get) => ({
  openEmojiPickerMessageId: null,
  setEmojiPickerOpen: (messageId) =>
    set({ openEmojiPickerMessageId: messageId }),
  isEmojiPickerOpen: () => get().openEmojiPickerMessageId !== null,
}));
