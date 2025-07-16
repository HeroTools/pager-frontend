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
  threadHighlightMessageId: string | null;
  setThreadHighlightMessageId: (messageId: string | null) => void;
  profileMemberId: string | null;
  setProfilePanelOpen: (memberId: string | null) => void;
  isProfilePanelOpen: () => boolean;
  aiAssistantPanelOpen: boolean;
  setAiAssistantPanelOpen: (open: boolean) => void;
  toggleAiAssistantPanel: () => void;
  isAiAssistantPanelOpen: () => boolean;
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
    set({
      openThreadMessageId: message?.id,
      selectedThreadParentMessage: message,
    });
    if (!message) {
      set({ threadHighlightMessageId: null });
    }
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
  threadHighlightMessageId: null,
  setThreadHighlightMessageId: (messageId) => set({ threadHighlightMessageId: messageId }),
  profileMemberId: null,
  setProfilePanelOpen: (memberId) => {
    set({ profileMemberId: memberId });
  },
  isProfilePanelOpen: () => get().profileMemberId !== null,
  aiAssistantPanelOpen: false,
  setAiAssistantPanelOpen: (open) => set({ aiAssistantPanelOpen: open }),
  toggleAiAssistantPanel: () =>
    set((state) => ({
      aiAssistantPanelOpen: !state.aiAssistantPanelOpen,
    })),
  isAiAssistantPanelOpen: () => get().aiAssistantPanelOpen,
}));
