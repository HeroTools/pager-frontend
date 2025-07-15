import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useDebounce } from 'use-debounce';

import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { useGetAllAvailableChannels } from '@/features/channels/hooks/use-channels-mutations';
import { useConversations } from '@/features/conversations/hooks/use-conversations';
import { useGetMembers } from '@/features/members/hooks/use-members';
import { useSearch } from '@/features/search/hooks/use-search';
import type { SearchResult } from '@/features/search/types';
import { useUIStore } from '@/store/ui-store';
import { SEARCH_DEBOUNCE_MS, SEARCH_LIMIT } from '../constants';
import { filterItems, getNavigationUrl, getUniqueResults } from '../utils';

export const useSearchDialog = (workspaceId: string) => {
  const router = useRouter();
  const { setThreadOpen } = useUIStore();

  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [creatingConversationWith, setCreatingConversationWith] = useState<string | null>(null);
  const [debouncedQuery] = useDebounce(inputValue, SEARCH_DEBOUNCE_MS);

  const { data: channels } = useGetAllAvailableChannels(workspaceId);
  const { data: members } = useGetMembers(workspaceId);
  const { conversations, createConversation } = useConversations(workspaceId);
  const { user: currentUser } = useCurrentUser(workspaceId);

  const { data: searchData, isLoading: isSearching } = useSearch(workspaceId, debouncedQuery, {
    includeThreads: true,
    limit: SEARCH_LIMIT,
  });

  const filteredChannels = useMemo(() => filterItems(channels, inputValue), [channels, inputValue]);

  const filteredMembers = useMemo(() => filterItems(members, inputValue), [members, inputValue]);

  const uniqueResults = useMemo(() => getUniqueResults(searchData?.results), [searchData?.results]);

  const handleChannelClick = useCallback(
    (channelId: string) => () => {
      setOpen(false);
      setThreadOpen(null);
      router.push(`/${workspaceId}/c-${channelId}`);
    },
    [workspaceId, router],
  );

  const handleMemberClick = useCallback(
    (memberId: string) => async () => {
      setOpen(false);
      setThreadOpen(null);
      if (!currentUser?.workspace_member_id) {
        toast.error('Unable to find current user information');
        return;
      }

      const existingConversation = conversations?.find((conversation) => {
        return (
          !conversation.is_group_conversation &&
          conversation.other_members?.length === 1 &&
          conversation.other_members[0].workspace_member.id === memberId
        );
      });

      if (existingConversation) {
        router.push(`/${workspaceId}/d-${existingConversation.id}`);
        return;
      }

      try {
        setCreatingConversationWith(memberId);
        const newConversation = await createConversation.mutateAsync({
          participantMemberIds: [memberId],
        });
        router.push(`/${workspaceId}/d-${newConversation.id}`);
      } catch (error) {
        console.error('Failed to create conversation:', error);
        toast.error('Failed to create conversation. Please try again.');
      } finally {
        setCreatingConversationWith(null);
      }
    },
    [workspaceId, router, conversations, currentUser, createConversation],
  );

  const handleMessageClick = useCallback(
    (result: SearchResult) => () => {
      setOpen(false);
      const navigationUrl = getNavigationUrl({ workspaceId, result });

      if (!navigationUrl) {
        setThreadOpen(null);
        toast.error('Unable to navigate to this message');
        return;
      }

      router.push(navigationUrl);
    },
    [workspaceId, router],
  );

  const handleLegacyMessageClick = useCallback(
    (messageId: string) => () => {
      setOpen(false);
      setThreadOpen(null);
      router.push(`/${workspaceId}/m-${messageId}`);
    },
    [workspaceId, router],
  );

  const resetInput = useCallback(() => {
    setInputValue('');
  }, []);

  return {
    open,
    setOpen,
    inputValue,
    setInputValue,
    searchData,
    isSearching,
    filteredChannels,
    filteredMembers,
    uniqueResults,
    creatingConversationWith,
    handleChannelClick,
    handleMemberClick,
    handleMessageClick,
    handleLegacyMessageClick,
    resetInput,
  };
};
