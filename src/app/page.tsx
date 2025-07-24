'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';

import { useGetWorkspaces } from '@/features/workspaces';
import { useCreateWorkspaceModal } from '@/features/workspaces/store/use-create-workspace-modal';
import { Skeleton } from '@/components/ui/skeleton';

const SidebarSkeleton = () => (
  <div className="w-64 bg-muted border-r flex flex-col h-full">
    {/* Workspace header */}
    <div className="p-4 border-b">
      <div className="flex items-center gap-2">
        <Skeleton className="w-8 h-8 rounded" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="w-4 h-4" />
      </div>
    </div>

    <div className="flex-1 overflow-y-auto">
      {/* Navigation items */}
      <div className="p-2 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2">
          <Skeleton className="w-5 h-5" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="flex items-center gap-3 px-3 py-2">
          <Skeleton className="w-5 h-5" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>

      {/* Threads & Drafts */}
      <div className="px-4 py-2 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

      {/* Channels section */}
      <div className="px-4 py-2">
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="w-3 h-3" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="space-y-1 ml-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-2 py-1">
              <span className="text-muted-foreground">#</span>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
        <div className="mt-3 ml-4">
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      {/* Direct Messages section */}
      <div className="px-4 py-2">
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="w-3 h-3" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-2 ml-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="w-6 h-6 rounded-full" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Invite button */}
    <div className="p-4 border-t">
      <Skeleton className="h-8 w-full rounded" />
    </div>
  </div>
);

const MainContentSkeleton = () => (
  <div className="flex-1 flex flex-col h-full">
    {/* Channel header */}
    <div className="border-b p-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">#</span>
        <Skeleton className="h-6 w-16" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="w-8 h-8 rounded" />
        <Skeleton className="w-4 h-4" />
      </div>
    </div>

    {/* Messages area */}
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-4 w-full max-w-md" />
            {i === 2 && <Skeleton className="h-16 w-48 rounded border" />}
          </div>
        </div>
      ))}
    </div>

    {/* Message input */}
    <div className="border-t p-4">
      <div className="border rounded-lg p-3">
        <Skeleton className="h-4 w-32 mb-2" />
        <div className="flex items-center gap-2">
          <Skeleton className="w-6 h-6" />
          <Skeleton className="w-6 h-6" />
          <Skeleton className="w-6 h-6" />
        </div>
      </div>
    </div>
  </div>
);

export default function Home() {
  const router = useRouter();
  const { open, setOpen } = useCreateWorkspaceModal();
  const { isLoading, data: workspaces } = useGetWorkspaces();

  const workspaceId = useMemo(() => workspaces?.[0]?.id, [workspaces]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (workspaceId) {
      router.replace(`/${workspaceId}`);
    } else if (!open) {
      setOpen(true);
    }
  }, [workspaceId, isLoading, open, setOpen, router]);

  return (
    <div className="h-screen flex bg-white">
      <SidebarSkeleton />
      <MainContentSkeleton />
    </div>
  );
}
