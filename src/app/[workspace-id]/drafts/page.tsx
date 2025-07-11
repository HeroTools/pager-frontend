'use client';

import { useDraftsStore } from '@/features/drafts/store/use-drafts-store';
import type { Draft } from '@/features/drafts/store/use-drafts-store';
import React, { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DraftListItem } from '@/components/draft-list-item';
import { useGetUserChannels } from '@/features/channels/hooks/use-channels-mutations';
import { useConversations } from '@/features/conversations/hooks/use-conversations';
import { useWorkspaceId } from '@/hooks/use-workspace-id';
import { Skeleton } from '@/components/ui/skeleton';

const DraftsPage = () => {
  const workspaceId = useWorkspaceId();
  const { getWorkspaceDrafts } = useDraftsStore();
  const drafts = getWorkspaceDrafts(workspaceId);

  const { data: channels, isLoading: isLoadingChannels } = useGetUserChannels(workspaceId);
  const { conversations, isLoading: isLoadingConversations } = useConversations(workspaceId);

  const draftsWithEntities = useMemo(() => {
    if (isLoadingChannels || isLoadingConversations || !conversations || !channels) {
      return [];
    }
    return Object.entries(drafts as Record<string, Draft>)
      .map(([id, draft]) => {
        let entity;
        if (draft.type === 'channel') {
          entity = channels?.find((c) => c.id === id);
        } else {
          entity = conversations?.find((c) => c.id === id);
        }
        return { id, draft, entity };
      })
      .filter((item) => !!item.entity)
      .sort((a, b) => {
        const timeB = b.draft.updatedAt ? new Date(b.draft.updatedAt).getTime() : 0;
        const timeA = a.draft.updatedAt ? new Date(a.draft.updatedAt).getTime() : 0;
        return timeB - timeA;
      });
  }, [drafts, channels, conversations, isLoadingChannels, isLoadingConversations]);

  if (isLoadingChannels || isLoadingConversations) {
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
  console.log(draftsWithEntities);
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h1 className="text-2xl font-bold">Drafts</h1>
        <p className="text-muted-foreground">{draftsWithEntities.length} drafts</p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {draftsWithEntities.map(({ id, draft, entity }, index) => (
            <React.Fragment key={id}>
              <DraftListItem draft={draft} entity={entity!} />
              {index < draftsWithEntities.length - 1 && <Separator />}
            </React.Fragment>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default DraftsPage;
