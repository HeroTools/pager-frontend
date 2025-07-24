import { Search } from 'lucide-react';

import { SearchDialogContent } from '@/features/search/components/search-dialog-content';
import { Button } from '@/components/ui/button';
import { useWorkspaceId } from '@/hooks/use-workspace-id';

export const Toolbar = () => {
  const workspaceId = useWorkspaceId();

  return (
    <div className="flex items-center justify-between h-10 p-2 border-b bg-workspace-sidebar">
      <div className="flex-1" />
      <div className="min-w-72 max-w-[640px] flex-1">
        <SearchDialogContent workspaceId={workspaceId} />
        <Button
          size="sm"
          className="border-b border-border hover:bg-accent w-full justify-start h-7 px-2 bg-workspace-sidebar"
          onClick={() => {
            const event = new KeyboardEvent('keydown', {
              key: 'k',
              metaKey: true,
              bubbles: true,
            });
            document.dispatchEvent(event);
          }}
        >
          <Search className="size-4 text-muted-foreground mr-2" />
          <span className="text-muted-foreground text-xs">Search</span>
        </Button>
      </div>
    </div>
  );
};
