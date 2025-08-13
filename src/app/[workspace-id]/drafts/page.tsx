'use client';

import { Fragment, useMemo } from 'react';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useAgents } from '@/features/agents/hooks/use-agents';
import { useGetUserChannels } from '@/features/channels/hooks/use-channels-mutations';
import { useConversations } from '@/features/conversations/hooks/use-conversations';
import { DraftListItem } from '@/features/drafts/components/draft-list-item';
import { useDraftsStore } from '@/features/drafts/store/use-drafts-store';
import { useWorkspaceId } from '@/hooks/use-workspace-id';

const DraftsPage = () => {
  const workspaceId = useWorkspaceId();
  const { getWorkspaceDrafts } = useDraftsStore();
  const drafts = getWorkspaceDrafts(workspaceId);

  const { data: channels, isLoading: isLoadingChannels } = useGetUserChannels(workspaceId);
  const { conversations, isLoading: isLoadingConversations } = useConversations(workspaceId);
  const { data: agents, isLoading: isLoadingAgents } = useAgents(workspaceId);

  const draftsWithEntities = useMemo(() => {
    if (isLoadingChannels || isLoadingConversations || isLoadingAgents) {
      return [];
    }

    return drafts
      .map((draft, index) => {
        let entity = null;

        if (draft.type === 'agent_conversation') {
          // For agent drafts, extract agent ID from temp IDs
          const agentId = draft.entityId.match(/^temp-([^-]+)-/)?.[1];
          entity = agentId ? agents?.find((a) => a.id === agentId) : agents?.[0];
        } else if (draft.type === 'channel') {
          entity = channels?.find((c) => c.id === draft.entityId);
        } else {
          entity = conversations?.find((c) => c.id === draft.entityId);
        }

        return entity ? { id: `draft-${index}`, draft, entity } : null;
      })
      .filter(Boolean);
  }, [
    drafts,
    channels,
    conversations,
    agents,
    isLoadingChannels,
    isLoadingConversations,
    isLoadingAgents,
  ]);

  if (isLoadingChannels || isLoadingConversations || isLoadingAgents) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b">
          <h1 className="text-2xl font-bold">Drafts</h1>
          <p className="text-muted-foreground">Loading drafts...</p>
        </div>
        <div className="p-4 space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h1 className="text-2xl font-bold">Drafts</h1>
        <p className="text-muted-foreground">{draftsWithEntities.length} drafts</p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {draftsWithEntities.map(({ id, draft, entity }, index) => (
            <Fragment key={id}>
              <DraftListItem draft={draft} entity={entity} />
              {index < draftsWithEntities.length - 1 && <Separator />}
            </Fragment>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default DraftsPage;
