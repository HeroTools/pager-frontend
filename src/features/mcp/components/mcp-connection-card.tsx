'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Settings,
  TestTube,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { McpConnectionWithCreator } from '../types';
import { useTestMcpConnection } from '../hooks/use-mcp-connections';
import { formatDistanceToNow } from 'date-fns';

interface McpConnectionCardProps {
  connection: McpConnectionWithCreator;
  workspaceId: string;
  onEdit: () => void;
  onDelete: () => void;
}

export function McpConnectionCard({
  connection,
  workspaceId,
  onEdit,
  onDelete,
}: McpConnectionCardProps) {
  const testConnectionMutation = useTestMcpConnection(workspaceId);

  const handleTest = () => {
    testConnectionMutation.mutate(connection.id);
  };

  const getStatusIcon = () => {
    switch (connection.status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'inactive':
        return <Clock className="w-4 h-4 text-gray-500" />;
      case 'pending_auth':
        return <Shield className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (connection.status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'pending_auth':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              {/* Provider icon could be added here */}
              <span className="text-sm font-medium uppercase">
                {connection.provider.substring(0, 2)}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-sm">{connection.name}</h3>
              <p className="text-xs text-muted-foreground">
                {connection.provider} • {connection.server_label}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {getStatusIcon()}
              <Badge variant="outline" className={getStatusColor()}>
                {connection.status}
              </Badge>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleTest} disabled={testConnectionMutation.isPending}>
                  <TestTube className="w-4 h-4 mr-2" />
                  {testConnectionMutation.isPending ? 'Testing...' : 'Test Connection'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit}>
                  <Settings className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {connection.description && (
          <p className="text-sm text-muted-foreground mb-3">{connection.description}</p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>Server: {new URL(connection.server_url).hostname}</span>
            {connection.require_approval && (
              <Badge variant="secondary" className="text-xs">
                Requires Approval
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {connection.last_tested_at ? (
              <span>
                Last tested {formatDistanceToNow(new Date(connection.last_tested_at))} ago
              </span>
            ) : (
              <span>Never tested</span>
            )}
          </div>
        </div>

        {connection.allowed_tools && connection.allowed_tools.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-2">Allowed tools:</p>
            <div className="flex flex-wrap gap-1">
              {connection.allowed_tools.slice(0, 3).map((tool) => (
                <Badge key={tool} variant="outline" className="text-xs">
                  {tool}
                </Badge>
              ))}
              {connection.allowed_tools.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{connection.allowed_tools.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
