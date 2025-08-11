'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import AgentConversationChat from '@/features/agents/components/agent-conversation-chat';
import { useAgentConversations } from '@/features/agents/hooks/use-agents';
import { useParamIds } from '@/hooks/use-param-ids';

export default function AgentConversationPage() {
  const { workspaceId, agentId } = useParamIds();
  const router = useRouter();

  const { data } = useAgentConversations(workspaceId, agentId);
  const conversationId = data?.conversations?.[0]?.id;

  useEffect(() => {
    if (conversationId) {
      router.replace(`/${workspaceId}/agents/${agentId}/${conversationId}`);
    }
  }, [conversationId, router, workspaceId, agentId]);

  return <AgentConversationChat agentId={agentId} conversationId={conversationId || null} />;
}
