'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ExternalLink, Shield } from 'lucide-react';

interface McpToolApprovalModalProps {
  open: boolean;
  onApprove: () => void;
  onDeny: () => void;
  toolCall: {
    toolName: string;
    serverLabel: string;
    provider: string;
    arguments: any;
    description?: string;
  };
}

export function McpToolApprovalModal({
  open,
  onApprove,
  onDeny,
  toolCall,
}: McpToolApprovalModalProps) {
  const [isApproving, setIsApproving] = useState(false);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await onApprove();
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <Shield className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <DialogTitle>External Tool Request</DialogTitle>
              <DialogDescription>
                The agent wants to use an external tool. Review and approve if safe.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tool Info */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{toolCall.toolName}</h4>
                <p className="text-sm text-muted-foreground">
                  From {toolCall.provider} • {toolCall.serverLabel}
                </p>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <ExternalLink className="w-3 h-3 mr-1" />
                External
              </Badge>
            </div>

            {toolCall.description && (
              <p className="text-sm text-muted-foreground">{toolCall.description}</p>
            )}
          </div>

          {/* Arguments Preview */}
          {toolCall.arguments && Object.keys(toolCall.arguments).length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium">Tool Parameters:</h5>
              <div className="bg-gray-50 p-3 rounded border text-xs">
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(toolCall.arguments, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">Review before approving</p>
              <p className="text-amber-700">
                This tool will access external services with the provided parameters. Only approve
                if you trust this action.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onDeny}>
            Deny
          </Button>
          <Button onClick={handleApprove} disabled={isApproving}>
            {isApproving ? 'Approving...' : 'Approve & Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
