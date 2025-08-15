'use client';

import AgentConversationChat from '@/features/agents/components/agent-conversation-chat';
import { useParamIds } from '@/hooks/use-param-ids';

export default function AgentConversationPage() {
  const { agentId, id: conversationId } = useParamIds();

  return <AgentConversationChat agentId={agentId} conversationId={conversationId} />;
}
