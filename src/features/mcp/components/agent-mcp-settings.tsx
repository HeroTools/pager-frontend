'use client';

import { CheckCircle, Plug, Settings, XCircle } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  useAgentMcpAccess,
  useUpdateAgentMcpAccess,
} from '@/features/mcp/hooks/use-agent-mcp-access';
import { AgentMcpAccessWithConnection } from '@/features/mcp/types';

interface AgentMcpSettingsProps {
  workspaceId: string;
  agentId: string;
}

export function AgentMcpSettings({ workspaceId, agentId }: AgentMcpSettingsProps) {
  const [pendingChanges, setPendingChanges] = useState<Record<string, boolean>>({});

  const { data: mcpAccess, isLoading } = useAgentMcpAccess(workspaceId, agentId);
  const updateAccessMutation = useUpdateAgentMcpAccess(workspaceId, agentId);

  const handleToggle = (connectionId: string, enabled: boolean) => {
    setPendingChanges((prev) => ({
      ...prev,
      [connectionId]: enabled,
    }));
  };

  const getEffectiveState = (access: AgentMcpAccessWithConnection): boolean => {
    return pendingChanges.hasOwnProperty(access.mcp_connection_id)
      ? pendingChanges[access.mcp_connection_id]
      : access.is_enabled;
  };

  const hasChanges = Object.keys(pendingChanges).length > 0;

  const handleSave = () => {
    if (!mcpAccess) return;

    const mcpAccessUpdates = mcpAccess.map((access) => ({
      mcp_connection_id: access.mcp_connection_id,
      is_enabled: getEffectiveState(access),
    }));

    updateAccessMutation.mutate(
      { mcp_access: mcpAccessUpdates },
      {
        onSuccess: () => {
          setPendingChanges({});
        },
      },
    );
  };

  const handleCancel = () => {
    setPendingChanges({});
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-6 w-10" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!mcpAccess || mcpAccess.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Plug className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">MCP Connections</CardTitle>
              <CardDescription className="text-sm">
                Enable external tools for this agent
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Plug className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              No MCP connections available. Create connections in workspace settings first.
            </p>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Manage Connections
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Plug className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">MCP Connections</CardTitle>
              <CardDescription className="text-sm">
                Control which external tools this agent can access
              </CardDescription>
            </div>
          </div>

          {hasChanges && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={updateAccessMutation.isPending}>
                {updateAccessMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {mcpAccess.map((access) => {
          const isEnabled = getEffectiveState(access);
          const hasChanged = pendingChanges.hasOwnProperty(access.mcp_connection_id);

          return (
            <div
              key={access.mcp_connection_id}
              className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                hasChanged ? 'bg-muted/50' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {access.mcp_connection.status === 'active' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <div>
                    <div className="font-medium text-sm">{access.mcp_connection.name}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{access.mcp_connection.provider}</span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          access.mcp_connection.status === 'active'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        {access.mcp_connection.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {hasChanged && (
                  <Badge variant="secondary" className="text-xs">
                    Modified
                  </Badge>
                )}
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(checked) => handleToggle(access.mcp_connection_id, checked)}
                  disabled={access.mcp_connection.status !== 'active'}
                />
              </div>
            </div>
          );
        })}

        {hasChanges && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              You have unsaved changes. Click &quot;Save Changes&quot; to apply them.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
