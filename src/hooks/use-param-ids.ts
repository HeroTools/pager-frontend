import { useParams } from 'next/navigation';
import { useMemo } from 'react';

export const useParamIds = (): {
  id: string;
  type: 'channel' | 'conversation';
  workspaceId: string;
} => {
  const params = useParams();

  return useMemo(() => {
    const entityId = params['entity-id'] as string;
    const workspaceId = (params['workspace-id'] as string) || '';

    if (!entityId) {
      return { id: '', type: 'channel' as const, workspaceId };
    }

    const prefix = entityId.charAt(0);
    const cleanId = entityId.slice(2);

    if (prefix === 'c') {
      return { id: cleanId, type: 'channel' as const, workspaceId };
    }

    if (prefix === 'd') {
      return { id: cleanId, type: 'conversation' as const, workspaceId };
    }

    // Return default instead of throwing
    console.error(`Invalid entity ID format: ${entityId}`);
    return { id: '', type: 'channel' as const, workspaceId };
  }, [params]);
};
