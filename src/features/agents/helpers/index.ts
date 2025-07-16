import { AgentMessageWithSender } from '../types';

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
