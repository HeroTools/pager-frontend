'use client';

import AgentConversationChat from '@/features/agents/components/agent-conversation-chat';
import { useParamIds } from '@/hooks/use-param-ids';

export default function AgentConversationPage() {
  const { workspaceId, agentId, id: conversationId } = useParamIds();

  if (!workspaceId || !agentId || !conversationId) {
    return <div>Loading...</div>;
  }

  return <AgentConversationChat agentId={agentId} conversationId={conversationId} />;
}
