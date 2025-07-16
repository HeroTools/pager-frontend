'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAgentConversations } from '@/features/agents/hooks/use-agents';
import { useParamIds } from '@/hooks/use-param-ids';

export default function AgentConversationPage() {
  const { workspaceId, agentId } = useParamIds();

  const router = useRouter();

  const { data, isLoading } = useAgentConversations(workspaceId, agentId);

  const conversationId = data?.conversations?.[0]?.id;

  useEffect(() => {
    if (conversationId) {
      router.push(`/${workspaceId}/agents/${agentId}/${conversationId}`);
    }
  }, [conversationId, router, workspaceId, agentId]);

  if (isLoading) {
    return <div>Loading...</div>;
  }
}
