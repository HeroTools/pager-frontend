'use client';

import { AlertTriangle, Loader } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';

import { Chat } from '@/components/chat/chat';
import { transformAgentMessages, transformSingleAgentMessage } from '@/features/agents/helpers';
import {
  useAgents,
  useInfiniteAgentConversationMessages,
} from '@/features/agents/hooks/use-agents';
import { useCreateMessage } from '@/features/agents/hooks/use-agents-mutations';
import { useCurrentUser } from '@/features/auth';
import type { UploadedAttachment } from '@/features/file-upload/types';
import { updateSelectedMessageIfNeeded } from '@/features/messages/helpers';
import { useMessagesStore } from '@/features/messages/store/messages-store';
import { useToggleReaction } from '@/features/reactions';
import { useParamIds } from '@/hooks/use-param-ids';
import { useUIStore } from '@/store/ui-store';
import { type Channel, ChannelType } from '@/types/chat';

interface AgentConversationChatProps {
  agentId: string;
  conversationId: string;
}

const AgentConversationChat = ({ agentId, conversationId }: AgentConversationChatProps) => {
  const { workspaceId } = useParamIds();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setThreadOpen, setThreadHighlightMessageId } = useUIStore();

  const { user: currentUser } = useCurrentUser(workspaceId);
  const { addPendingMessage, removePendingMessage } = useMessagesStore();

  // Get agents data
  const { data: agents, isLoading: isLoadingAgents } = useAgents(workspaceId);

  // Get conversation messages
  const {
    data: conversationWithMessages,
    isLoading: isLoadingMessages,
    error: messagesError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteAgentConversationMessages(workspaceId, agentId, conversationId, {
    limit: 50,
  });

  // Message operation hooks
  const { mutateAsync: createMessage } = useCreateMessage(workspaceId, agentId, conversationId);
  const toggleReaction = useToggleReaction(workspaceId);

  const agent = useMemo(() => {
    return agents?.find((a) => a.id === agentId);
  }, [agents, agentId]);

  const allMessages = useMemo(
    () => conversationWithMessages?.pages.flatMap((page) => page?.messages || []) || [],
    [conversationWithMessages?.pages],
  );

  const sortedMessages = useMemo(
    () =>
      [...allMessages].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      ),
    [allMessages],
  );

  // Transform agent messages to match your existing Message type
  const messages = useMemo(
    () => transformAgentMessages(sortedMessages || [], currentUser, agent),
    [sortedMessages, currentUser, agent],
  );

  const highlightMessageId = searchParams.get('highlight');
  const threadMessageId = searchParams.get('thread');

  useEffect(() => {
    if (threadMessageId && messages.length > 0 && !isLoadingMessages) {
      const parentMessage = messages.find((m) => m.id === threadMessageId);
      if (parentMessage) {
        setThreadOpen(parentMessage);
        setThreadHighlightMessageId(highlightMessageId);
        const newUrl = `/${workspaceId}/agents/${agentId}/${conversationId}`;
        router.replace(newUrl, { scroll: false });
      }
    }
  }, [
    threadMessageId,
    messages,
    setThreadOpen,
    router,
    workspaceId,
    agentId,
    conversationId,
    highlightMessageId,
    isLoadingMessages,
    setThreadHighlightMessageId,
  ]);

  // Transform agent data to Channel format for existing Chat component
  const transformAgentToChannel = (agent: any): Channel => {
    return {
      id: conversationId,
      name: agent?.name || 'AI Agent',
      description: agent?.description || `Chat with ${agent?.name}`,
      isPrivate: true,
      memberCount: 2, // User + Agent
      type: ChannelType.PRIVATE,
    };
  };

  const isLoading = isLoadingMessages || isLoadingAgents || !currentUser;
  const error = messagesError;

  if (isLoading) {
    return (
      <div className="h-full flex-1 flex items-center justify-center">
        <Loader className="animate-spin size-5 text-muted-foreground" />
      </div>
    );
  }

  // Handle error states
  if (error || !conversationWithMessages || !agents) {
    return (
      <div className="h-full flex-1 flex flex-col gap-y-2 items-center justify-center">
        <AlertTriangle className="size-5 text-muted-foreground" />
        <span className="text-muted-foreground text-sm">
          {error ? 'Failed to load conversation' : 'Conversation not found'}
        </span>
      </div>
    );
  }

  // Transform agent data for chat component
  const agentChannel = transformAgentToChannel(agents);

  // Handle message sending
  const handleSendMessage = async (content: {
    body: string;
    attachments: UploadedAttachment[];
    plainText: string;
  }) => {
    const optimisticId = `temp-${Date.now()}-${Math.random()}`;

    // Track that we're creating this message
    addPendingMessage(optimisticId, {
      workspaceId,
      conversationId,
      entityId: conversationId,
      entityType: 'agent_conversation',
    });

    try {
      const response = await createMessage({
        message: content.plainText,
        workspaceId,
        agentId,
        conversationId,
        _optimisticId: optimisticId,
      });

      updateSelectedMessageIfNeeded(
        optimisticId,
        transformSingleAgentMessage(response.userMessage, currentUser, agent),
      );
      removePendingMessage(optimisticId);
    } catch (error) {
      removePendingMessage(optimisticId);
      console.error('Failed to send message:', error);
    }
  };

  // Handle message editing
  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      await updateMessage.mutateAsync({
        messageId,
        data: { body: newContent },
      });
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  };

  // Handle message deletion
  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage.mutateAsync(messageId);
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  // Handle message reactions
  const handleReactToMessage = async (messageId: string, emoji: string) => {
    try {
      // Check if user already reacted with this emoji
      const message = allMessages.find((msg) => msg.id === messageId);
      const existingReaction = message?.reactions?.find((r) => r.value === emoji);
      const hasReacted = existingReaction?.users.some((user) => user.id === currentUser?.id);

      await toggleReaction.mutateAsync({
        messageId,
        emoji,
        currentlyReacted: hasReacted || false,
      });
    } catch (error) {
      console.error('Failed to react to message:', error);
    }
  };

  // Handle loading more messages (when user scrolls up)
  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Chat
        channel={agentChannel}
        messages={messages}
        currentUser={currentUser}
        chatType="agent"
        conversationData={conversationWithMessages?.pages?.[0]}
        isLoading={false}
        onSendMessage={handleSendMessage}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        onReactToMessage={handleReactToMessage}
        onLoadMore={handleLoadMore}
        hasMoreMessages={hasNextPage}
        isLoadingMore={isFetchingNextPage}
        highlightMessageId={highlightMessageId}
        members={[]} // No members to display for agent conversations
      />
    </div>
  );
};

export default AgentConversationChat;
