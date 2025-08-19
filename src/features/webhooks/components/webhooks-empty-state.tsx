import { Plus, Webhook } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface WebhooksEmptyStateProps {
  onCreateWebhook: () => void;
}

export function WebhooksEmptyState({ onCreateWebhook }: WebhooksEmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Webhook className="w-6 h-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No webhooks yet</h3>
        <p className="text-muted-foreground text-center mb-4 max-w-md">
          Create your first webhook to start integrating external services with your workspace.
        </p>
        <Button onClick={onCreateWebhook}>
          <Plus className="w-4 h-4 mr-2" />
          Create Webhook
        </Button>
      </CardContent>
    </Card>
  );
}
