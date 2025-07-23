'use client';

import { useParams } from 'next/navigation';
import { useMemo } from 'react';

export const useParamIds = (): {
  id: string;
  type: 'channel' | 'conversation' | 'agent-conversation';
  workspaceId: string;
  agentId?: string;
  agentConversationId?: string;
} => {
  const params = useParams();

  return useMemo(() => {
    const entityId = params['entity-id'] as string;
    const workspaceId = (params['workspace-id'] as string) || '';
    const agentId = (params['agent-id'] as string) || '';
    const agentConversationId = (params['conversation-id'] as string) || '';

    if (agentId) {
      return {
        id: agentConversationId,
        type: 'agent-conversation' as const,
        agentId,
        workspaceId,
      };
    }

    if (!entityId) {
      return {
        id: agentConversationId,
        type: 'agent-conversation' as const,
        workspaceId,
        agentId,
      };
    }

    const prefix = entityId.charAt(0);
    const cleanId = entityId.slice(2);

    if (prefix === 'c') {
      return {
        id: cleanId,
        type: 'channel' as const,
        workspaceId,
      };
    }

    if (prefix === 'd') {
      return {
        id: cleanId,
        type: 'conversation' as const,
        workspaceId,
      };
    }

    console.error(`Invalid entity ID format: ${entityId}`);
    return {
      id: '',
      type: 'channel' as const,
      workspaceId,
    };
  }, [params]);
};
