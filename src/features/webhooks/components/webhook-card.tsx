import { Info, MoreHorizontal, Settings, Trash2 } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { type Webhook } from '../types';
import { ServiceIcon } from './service-icons';
import { SOURCE_TYPE_INFO } from './webhook-limits-info';

interface WebhookCardProps {
  webhook: Webhook;
  onViewDetails: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function WebhookCard({ webhook, onViewDetails, onEdit, onDelete }: WebhookCardProps) {
  const sourceInfo = SOURCE_TYPE_INFO[webhook.source_type as keyof typeof SOURCE_TYPE_INFO];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <ServiceIcon type={webhook.source_type} className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-lg font-semibold">{webhook.name}</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {sourceInfo?.label || webhook.source_type}
                </Badge>
              </div>
              <CardDescription className="text-sm">
                Created by {webhook.created_by_name} on {formatDate(webhook.created_at)}
                {webhook.channel_name && <span className="ml-2">• #{webhook.channel_name}</span>}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {webhook.source_type === 'stripe' && !webhook.signing_secret ? (
              <Badge variant="outline" className="text-text-warning border-text-warning/30 bg-text-warning/10">
                Setup Required
              </Badge>
            ) : (
              <Badge variant={webhook.is_active ? 'default' : 'secondary'}>
                {webhook.is_active ? 'Active' : 'Inactive'}
              </Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onViewDetails}>View Details</DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit}>
                  <Settings className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {webhook.source_type === 'stripe' && !webhook.signing_secret && (
          <Alert className="border-text-warning/30 bg-text-warning/10">
            <Info className="h-4 w-4 text-text-warning" />
            <AlertDescription className="text-foreground">
              <strong>Setup Required:</strong> Add the webhook URL to your Stripe Dashboard, then
              edit this webhook to add the signing secret to enable events.
            </AlertDescription>
          </Alert>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Messages:</span>
            <div className="font-medium">{webhook.message_count || 0}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Last Used:</span>
            <div className="font-medium">
              {webhook.last_used_at ? formatDate(webhook.last_used_at) : 'Never'}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Total Requests:</span>
            <div className="font-medium">{webhook.total_requests || 0}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}