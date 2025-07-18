import { CurrentUser } from '@/features/auth/types';
import { Author, Message } from '@/types/chat';
import { AgentMessageWithSender } from './types';

// Helper function to check if message is from current user
export const isMessageFromCurrentUser = (
  message: AgentMessageWithSender,
  currentUserId: string,
): boolean => {
  return message.sender_type === 'user' && message.workspace_member_id !== null;
};

// Helper function to check if message is from agent
export const isMessageFromAgent = (message: AgentMessageWithSender): boolean => {
  return message.sender_type === 'agent' && message.ai_agent_id !== null;
};

// Helper function to check if message is from system
export const isMessageFromSystem = (message: AgentMessageWithSender): boolean => {
  return message.sender_type === 'system';
};

// Helper function to get message sender type
export const getMessageSenderType = (
  message: AgentMessageWithSender,
): 'user' | 'agent' | 'system' => {
  return message.sender_type;
};

// Helper function to format message for display (profiles will come from context)
export const formatMessageForDisplay = (message: AgentMessageWithSender, currentUserId: string) => {
  const isFromCurrentUser = isMessageFromCurrentUser(message, currentUserId);
  const isFromAgent = isMessageFromAgent(message);
  const isFromSystem = isMessageFromSystem(message);

  return {
    id: message.id,
    body: message.body,
    createdAt: message.created_at,
    updatedAt: message.updated_at,
    editedAt: message.edited_at,
    senderType: message.sender_type,
    workspaceMemberId: message.workspace_member_id,
    aiAgentId: message.ai_agent_id,
    isFromCurrentUser,
    isFromAgent,
    isFromSystem,
    reactions: message.reactions,
    attachments: message.attachments,
    blocks: message.blocks,
    metadata: message.metadata,
  };
};

// Transform agent messages to match your existing Message type
export const transformAgentMessages = (
  agentMessages: AgentMessageWithSender[],
  currentUser: CurrentUser | null,
  agent: any,
): Message[] => {
  if (!currentUser) return [];
  return agentMessages.map((agentMessage) => {
    // Determine the author based on sender type
    const author: Author =
      agentMessage.sender_type === 'user'
        ? {
            id: currentUser.id,
            name: currentUser.name,
            avatar: currentUser.image || '',
            status: 'online' as const,
          }
        : {
            id: agent?.id || 'agent',
            name: agent?.name || 'AI Agent',
            avatar: agent?.avatar_url || '',
            status: 'online' as const,
          };

    return {
      id: agentMessage.id,
      authorId: author.id,
      author,
      content: agentMessage.body,
      timestamp: new Date(agentMessage.created_at),
      isEdited: !!agentMessage.edited_at,
      reactions: agentMessage.reactions || [],
      attachments: [],
      threadCount: 0, // Agent conversations don't have threads yet
      parentMessageId: agentMessage.parent_message_id,
      replyCount: 0,
      blocks: agentMessage.blocks,
      metadata: agentMessage.metadata,
      hasDraft: false, // Will be set by the parent component
      isOptimistic: agentMessage._isOptimistic || false, // Preserve the optimistic flag
      sender_type: agentMessage.sender_type,
      _isStreaming: agentMessage._isStreaming,
      _thinking: agentMessage._thinking,
    };
  });
};

// Helper to transform a single agent message (useful for optimistic updates)
export const transformSingleAgentMessage = (
  agentMessage: AgentMessageWithSender,
  currentUser: CurrentUser,
  agent: any,
): Message => {
  const transformed = transformAgentMessages([agentMessage], currentUser, agent);
  return transformed[0];
};
