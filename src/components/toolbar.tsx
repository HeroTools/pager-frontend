import { Search } from 'lucide-react';

import { SearchDialogContent } from '@/features/search/components/search-dialog-content';
import { Button } from '@/components/ui/button';
import { useWorkspaceId } from '@/hooks/use-workspace-id';

export const Toolbar = () => {
  const workspaceId = useWorkspaceId();

  return (
    <div className="flex items-center justify-between h-10 p-1.5 border-b">
      <div className="flex-1" />
      <div className="min-w-[280px] max-w-[642px] flex-1">
        <SearchDialogContent workspaceId={workspaceId} />
        <Button
          size="sm"
          className="border hover:bg-accent w-full justify-start h-7 px-2 bg-background"
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
