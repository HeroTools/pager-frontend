import { MemberWithUser } from "@/features/members/types";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface ConversationCreateStoreState {
  isCreatingConversation: boolean;
  selectedMembers: MemberWithUser[];
  searchQuery: string;
  startConversationCreation: () => void;
  cancelConversationCreation: () => void;
  selectMember: (member: MemberWithUser) => void;
  removeMember: (memberId: string) => void;
  setSearchQuery: (query: string) => void;
  clearSelection: () => void;

  getConversationTitle: () => string;
  canCreateConversation: () => boolean;
  getFilteredMembers: (availableMembers: MemberWithUser[]) => MemberWithUser[];
}

export const useConversationCreateStore =
  create<ConversationCreateStoreState>()(
    devtools(
      (set, get) => ({
        isCreatingConversation: false,
        selectedMembers: [],
        searchQuery: "",
        startConversationCreation: () => {
          set(
            {
              isCreatingConversation: true,
              selectedMembers: [],
              searchQuery: "",
            },
            false,
            "startConversationCreation"
          );
        },

        cancelConversationCreation: () => {
          set(
            {
              isCreatingConversation: false,
              selectedMembers: [],
              searchQuery: "",
            },
            false,
            "cancelConversationCreation"
          );
        },

        selectMember: (member: MemberWithUser) => {
          const { selectedMembers } = get();

          if (selectedMembers.find((m) => m.id === member.id)) {
            return;
          }

          set(
            {
              selectedMembers: [...selectedMembers, member],
              searchQuery: "",
            },
            false,
            "selectMember"
          );
        },

        removeMember: (memberId: string) => {
          const { selectedMembers } = get();
          set(
            {
              selectedMembers: selectedMembers.filter((m) => m.id !== memberId),
            },
            false,
            "removeMember"
          );
        },

        setSearchQuery: (query: string) => {
          set({ searchQuery: query }, false, "setSearchQuery");
        },

        clearSelection: () => {
          set(
            { selectedMembers: [], searchQuery: "" },
            false,
            "clearSelection"
          );
        },

        // Helper methods for UI logic
        getConversationTitle: () => {
          const { selectedMembers } = get();

          if (selectedMembers.length === 0) return "New message";
          if (selectedMembers.length === 1) return selectedMembers[0].user.name;
          if (selectedMembers.length === 2) {
            return `${selectedMembers[0].user.name}, ${selectedMembers[1].user.name}`;
          }
          return `${selectedMembers[0].user.name}, ${
            selectedMembers[1].user.name
          } and ${selectedMembers.length - 1} other${
            selectedMembers.length > 2 ? "s" : ""
          }`;
        },

        canCreateConversation: () => {
          const { selectedMembers } = get();
          return selectedMembers.length > 0;
        },

        getFilteredMembers: (availableMembers: MemberWithUser[]) => {
          const { selectedMembers, searchQuery } = get();

          if (!searchQuery.trim()) {
            return [];
          }

          return availableMembers.filter(
            (member) =>
              !selectedMembers.find((selected) => selected.id === member.id) &&
              member.user.name.toLowerCase().includes(searchQuery.toLowerCase())
          );
        },
      }),
      {
        name: "conversation-create-store",
      }
    )
  );
