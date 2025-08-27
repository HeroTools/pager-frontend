'use client';

import { ArrowLeft, Info, Plug, Plus } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/features/auth';
import { McpConnectionCard } from '@/features/mcp/components/mcp-connection-card';
import { McpConnectionDeleteModal } from '@/features/mcp/components/mcp-connection-delete-modal';
import { McpConnectionModal } from '@/features/mcp/components/mcp-connection-modal';
import { McpEmptyState } from '@/features/mcp/components/mcp-empty-state';
import { useMcpConnections } from '@/features/mcp/hooks/use-mcp-connections';
import { McpConnectionWithCreator } from '@/features/mcp/types';
import { useWorkspaceId } from '@/hooks/use-workspace-id';

const McpPage = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<McpConnectionWithCreator | null>(
    null,
  );
  const [oauthAlert, setOauthAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = useWorkspaceId();
  const { user, isLoading: userLoading } = useCurrentUser(workspaceId);
  const { data: connections, isLoading, error } = useMcpConnections(workspaceId);

  // Handle OAuth callback
  useEffect(() => {
    const oauthStatus = searchParams.get('oauth');
    const connectionId = searchParams.get('connection');
    const errorMessage = searchParams.get('message');

    if (oauthStatus === 'success') {
      setOauthAlert({
        type: 'success',
        message: 'OAuth authentication completed successfully! Your connection is now active.',
      });
      
      // Clear URL parameters
      const url = new URL(window.location.href);
      url.searchParams.delete('oauth');
      url.searchParams.delete('connection');
      window.history.replaceState({}, '', url.toString());
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => setOauthAlert(null), 5000);
    } else if (oauthStatus === 'error') {
      setOauthAlert({
        type: 'error',
        message: `OAuth authentication failed: ${errorMessage || 'Unknown error'}`,
      });
      
      // Clear URL parameters
      const url = new URL(window.location.href);
      url.searchParams.delete('oauth');
      url.searchParams.delete('message');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

  const openEditDialog = (connection: McpConnectionWithCreator) => {
    setSelectedConnection(connection);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (connection: McpConnectionWithCreator) => {
    setSelectedConnection(connection);
    setDeleteDialogOpen(true);
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-4xl space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Plug className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold">Access Restricted</h3>
          <p className="text-sm text-muted-foreground">
            Only workspace administrators can manage MCP connections.
          </p>
          <Button variant="outline" onClick={() => router.back()} size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Settings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
        <div className="py-4 sm:py-6">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs sm:text-sm text-muted-foreground">Settings</span>
            <span className="text-xs sm:text-sm text-muted-foreground">/</span>
            <span className="text-xs sm:text-sm text-muted-foreground">Integrations</span>
            <span className="text-xs sm:text-sm text-muted-foreground">/</span>
            <span className="text-xs sm:text-sm text-muted-foreground">MCP</span>
          </div>

          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">
                MCP Connections
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Connect your agents to external tools via Model Context Protocol
              </p>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Connection
            </Button>
          </div>

          <div className="space-y-6">
            {/* OAuth Callback Alert */}
            {oauthAlert && (
              <Alert variant={oauthAlert.type === 'success' ? 'default' : 'destructive'}>
                <AlertDescription>
                  {oauthAlert.message}
                </AlertDescription>
              </Alert>
            )}

            {/* Info Alert */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                MCP (Model Context Protocol) allows your AI agents to securely connect to external
                tools and services like Linear, GitHub, Notion, and more. Each connection can be
                enabled per agent.
              </AlertDescription>
            </Alert>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  Failed to load MCP connections. Please try refreshing the page.
                </AlertDescription>
              </Alert>
            )}

            {/* Connections List */}
            {isLoading ? (
              <div className="grid gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 w-full" />
                ))}
              </div>
            ) : connections && connections.length > 0 ? (
              <div className="grid gap-4">
                {connections.map((connection) => (
                  <McpConnectionCard
                    key={connection.id}
                    connection={connection}
                    workspaceId={workspaceId}
                    onEdit={() => openEditDialog(connection)}
                    onDelete={() => openDeleteDialog(connection)}
                  />
                ))}
              </div>
            ) : (
              <McpEmptyState onCreateConnection={() => setCreateDialogOpen(true)} />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <McpConnectionModal
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        workspaceId={workspaceId}
        mode="create"
      />

      <McpConnectionModal
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        workspaceId={workspaceId}
        mode="edit"
        connection={selectedConnection}
      />

      <McpConnectionDeleteModal
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        workspaceId={workspaceId}
        connection={selectedConnection}
      />
    </>
  );
};

export default McpPage;
