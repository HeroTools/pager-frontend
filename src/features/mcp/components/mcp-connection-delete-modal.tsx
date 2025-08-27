'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';
import { McpConnectionWithCreator } from '../types';
import { useDeleteMcpConnection } from '../hooks/use-mcp-connections';

interface McpConnectionDeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  connection: McpConnectionWithCreator | null;
}

export function McpConnectionDeleteModal({
  open,
  onOpenChange,
  workspaceId,
  connection,
}: McpConnectionDeleteModalProps) {
  const deleteConnectionMutation = useDeleteMcpConnection(workspaceId);

  const handleDelete = () => {
    if (!connection) return;

    deleteConnectionMutation.mutate(connection.id, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  if (!connection) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <DialogTitle>Delete MCP Connection</DialogTitle>
              <DialogDescription>This action cannot be undone.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Are you sure you want to delete the <strong>{connection.name}</strong> MCP connection?
          </p>

          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm font-medium mb-1">This will:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Remove the connection from all agents</li>
              <li>• Disable all associated tools for agents</li>
              <li>• Cannot be undone</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteConnectionMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteConnectionMutation.isPending}
          >
            {deleteConnectionMutation.isPending ? 'Deleting...' : 'Delete Connection'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
