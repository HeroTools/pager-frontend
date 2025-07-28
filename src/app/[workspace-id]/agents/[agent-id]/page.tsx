'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { SkeletonMessages } from '@/components/chat/skeleton-messages';
import AgentConversationChat from '@/features/agents/components/agent-conversation-chat';
import { useAgentConversations } from '@/features/agents/hooks/use-agents';
import { useParamIds } from '@/hooks/use-param-ids';

export default function AgentConversationPage() {
  const { workspaceId, agentId } = useParamIds();
  const router = useRouter();

  const { data, isLoading } = useAgentConversations(workspaceId, agentId);

  const conversationId = data?.conversations?.[0]?.id;

  useEffect(() => {
    if (conversationId) {
      router.replace(`/${workspaceId}/agents/${agentId}/${conversationId}`);
    }
  }, [conversationId, router, workspaceId, agentId]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="flex-1 bg-chat">
          <div className="px-4 py-4 space-y-2">
            <SkeletonMessages count={15} />
          </div>
        </div>
      </div>
    );
  }

  return <AgentConversationChat agentId={agentId} conversationId={conversationId || null} />;
}
