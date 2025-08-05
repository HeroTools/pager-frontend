export interface AgentChatData {
  _optimisticId?: string;
  _tempConversationId?: string;
  workspaceId: string;
  message: string;
  conversationId: string;
  agentId: string;
  stream?: boolean;
}

export interface AgentCreatedBy {
  name: string;
  image: string | null;
}

export interface AgentEntity {
  id: string;
  name: string;
  description: string | null;
  model: string;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: AgentCreatedBy | null;
}

export interface AgentFilters {
  include_inactive?: boolean;
}

export interface AgentConversationLastMessage {
  body: string;
  created_at: string;
  sender_type: 'user' | 'agent' | 'system';
  sender_name: string;
}

export interface AgentConversation {
  id: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
  title: string | null;
  last_read_message_id: string | null;
  is_hidden: boolean;
  last_message: AgentConversationLastMessage | null;
}

export interface AgentConversationsResponse {
  agent: {
    id: string;
    name: string;
    avatar_url: string | null;
    is_active: boolean;
  };
  conversations: AgentConversation[];
  pagination: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface AgentConversationFilters {
  include_hidden?: boolean;
  limit?: number;
  cursor?: string; // timestamp cursor for pagination
}

export interface AgentMessageWithSender {
  id: string;
  body: string;
  workspace_member_id: string | null;
  ai_agent_id: string | null;
  workspace_id: string;
  channel_id: string | null;
  conversation_id: string;
  parent_message_id: string | null;
  thread_id: string | null;
  message_type: string;
  sender_type: 'user' | 'agent' | 'system';
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  blocks: any;
  metadata: any;
  reactions: Array<{
    id: string;
    value: string;
    count: number;
    users: Array<{ id: string; name: string }>;
  }>;
  attachments: Array<{
    id: string;
    original_filename: string;
    storage_url: string;
    content_type: string;
    size_bytes: number;
    order_index: number;
  }>;
  _isOptimistic?: boolean;
  _isStreaming?: boolean;
  _thinking?: ThinkingEvent;
}

export interface AgentChatResponse {
  userMessage: AgentMessageWithSender;
  agentMessage: AgentMessageWithSender;
  conversation: AgentConversation;
}

export interface AgentConversationData {
  conversation: {
    id: string;
    workspace_id: string;
    created_at: string;
    updated_at: string;
    title: string | null;
  };
  agent: {
    id: string;
    name: string;
    avatar_url: string | null;
    is_active: boolean;
  };
  messages: AgentMessageWithSender[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
    totalCount: number;
  };
  user_conversation_data: {
    member_id: string;
    last_read_message_id: string | null;
    workspace_member_id: string;
  };
}

export interface AgentConversationMessageFilters {
  limit?: number;
  cursor?: string;
  before?: string;
  include_reactions?: boolean;
  include_attachments?: boolean;
  include_count?: boolean;
}

export interface ThinkingEvent {
  status: 'thinking' | 'generating' | 'using_tools' | 'processing' | 'complete';
  message: string;
  toolCallsUsed?: number;
  processingTime?: number;
}

export interface StreamingChatData {
  message: string;
  conversationId?: string | null;
  agentId: string;
  workspaceId: string;
}

export interface ToolCall {
  type: 'tool_call_start' | 'tool_call_end';
  toolName: string;
  arguments?: any;
  result?: any;
  callId: string;
  message: string;
}

export interface AgentStep {
  type: 'step_start' | 'step_end';
  stepType: string;
  message: string;
}
