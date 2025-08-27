'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plug, Plus } from 'lucide-react';

interface McpEmptyStateProps {
  onCreateConnection: () => void;
}

export function McpEmptyState({ onCreateConnection }: McpEmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Plug className="w-8 h-8 text-muted-foreground" />
        </div>

        <h3 className="text-lg font-semibold mb-2">No MCP connections yet</h3>

        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          Connect your agents to external tools and services like Linear, GitHub, Notion, and more.
          Each connection allows agents to interact with external APIs securely.
        </p>

        <Button onClick={onCreateConnection}>
          <Plus className="w-4 h-4 mr-2" />
          Add Your First Connection
        </Button>

        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-lg">
          <div className="text-center">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mx-auto mb-2">
              <span className="text-blue-600 font-semibold text-sm">LI</span>
            </div>
            <span className="text-xs text-muted-foreground">Linear</span>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mx-auto mb-2">
              <span className="text-gray-600 font-semibold text-sm">GH</span>
            </div>
            <span className="text-xs text-muted-foreground">GitHub</span>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 rounded-lg bg-black flex items-center justify-center mx-auto mb-2">
              <span className="text-white font-semibold text-sm">NO</span>
            </div>
            <span className="text-xs text-muted-foreground">Notion</span>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mx-auto mb-2">
              <span className="text-purple-600 font-semibold text-sm">SL</span>
            </div>
            <span className="text-xs text-muted-foreground">Slack</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
