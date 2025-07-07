import type { Message } from '@/types/chat';
import { create } from 'zustand';

interface UIState {
  openEmojiPickerMessageId: string | null;
  openEmojiPickerMessageIdInThread: string | null;
  setEmojiPickerOpen: (messageId: string | null) => void;
  setEmojiPickerOpenInThread: (messageId: string | null) => void;
  isEmojiPickerOpen: () => boolean;
  openThreadMessageId: string | null;
  setThreadOpen: (message: Message | null) => void;
  selectedThreadParentMessage: Message | null;
  setSelectedThreadParentMessage: (message: Message | null) => void;
  isThreadOpen: () => boolean;
  isNotificationsPanelOpen: boolean;
  setNotificationsPanelOpen: (open: boolean) => void;
  toggleNotificationsPanel: () => void;
  // Profile panel state
  profileMemberId: string | null;
  setProfilePanelOpen: (memberId: string | null) => void;
  isProfilePanelOpen: () => boolean;
}

export const useUIStore = create<UIState>((set, get) => ({
  openEmojiPickerMessageId: null,
  openEmojiPickerMessageIdInThread: null,
  setEmojiPickerOpen: (messageId) => set({ openEmojiPickerMessageId: messageId }),
  setEmojiPickerOpenInThread: (messageId) => set({ openEmojiPickerMessageIdInThread: messageId }),
  isEmojiPickerOpen: () => {
    const state = get();
    return (
      state.openEmojiPickerMessageId !== null || state.openEmojiPickerMessageIdInThread !== null
    );
  },
  openThreadMessageId: null,
  setThreadOpen: (message) => {
    set({ openThreadMessageId: message?.id });
    set({ selectedThreadParentMessage: message });
  },
  selectedThreadParentMessage: null,
  setSelectedThreadParentMessage: (message) => set({ selectedThreadParentMessage: message }),
  isThreadOpen: () => get().openThreadMessageId !== null,
  isNotificationsPanelOpen: false,
  setNotificationsPanelOpen: (open) => set({ isNotificationsPanelOpen: open }),
  toggleNotificationsPanel: () =>
    set((state) => ({
      isNotificationsPanelOpen: !state.isNotificationsPanelOpen,
    })),
  // Profile panel state
  profileMemberId: null,
  setProfilePanelOpen: (memberId) => {
    console.log('🔍 UI Store - setProfilePanelOpen called with:', memberId);
    set({ profileMemberId: memberId });
  },
  isProfilePanelOpen: () => get().profileMemberId !== null,
}));
