'use client';

import { ArrowLeft, Info, Plus, Webhook } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/features/auth';
import {
  CreateWebhookModal,
  DeleteWebhookModal,
  EditWebhookModal,
  WebhookCard,
  WebhookDetailsModal,
  WebhookLimitsInfo,
  WebhooksEmptyState,
} from '@/features/webhooks/components';
import { useWebhooks } from '@/features/webhooks/hooks/use-webhooks';
import { type Webhook as WebhookType } from '@/features/webhooks/types';
import { useWorkspaceId } from '@/hooks/use-workspace-id';

const WebhooksPage = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookType | null>(null);

  const router = useRouter();
  const workspaceId = useWorkspaceId();
  const { user, isLoading: userLoading } = useCurrentUser(workspaceId);
  const { data: webhooks, isLoading, error } = useWebhooks(workspaceId);

  const getWebhookCounts = useCallback(() => {
    if (!webhooks) return {};
    return webhooks.reduce(
      (acc, webhook) => {
        acc[webhook.source_type] = (acc[webhook.source_type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [webhooks]);

  const handleWebhookCreated = (webhook: WebhookType) => {
    setSelectedWebhook(webhook);
    setDetailsDialogOpen(true);
  };

  const openEditDialog = (webhook: WebhookType) => {
    setSelectedWebhook(webhook);
    setEditDialogOpen(true);
  };

  const openDetailsDialog = (webhook: WebhookType) => {
    setSelectedWebhook(webhook);
    setDetailsDialogOpen(true);
  };

  const openDeleteDialog = (webhook: WebhookType) => {
    setSelectedWebhook(webhook);
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
            <Webhook className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold">Access Restricted</h3>
          <p className="text-sm text-muted-foreground">
            Only workspace administrators can manage webhooks.
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
            <span className="text-xs sm:text-sm text-muted-foreground">Webhooks</span>
          </div>

          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">Webhooks</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Manage webhooks for automated message posting
              </p>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Webhook
            </Button>
          </div>

          <div className="space-y-6">
            {/* Info Alert */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Create webhooks for external integrations. Custom webhooks allow flexible message
                posting, while service webhooks automatically format events from GitHub, Linear,
                Jira, and Stripe.
              </AlertDescription>
            </Alert>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  Failed to load webhooks. Please try refreshing the page.
                </AlertDescription>
              </Alert>
            )}

            {/* Webhook Limits */}
            <WebhookLimitsInfo webhookCounts={getWebhookCounts()} />

            {/* Webhooks List */}
            {isLoading ? (
              <div className="grid gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 w-full" />
                ))}
              </div>
            ) : webhooks && webhooks.length > 0 ? (
              <div className="grid gap-4">
                {webhooks.map((webhook) => (
                  <WebhookCard
                    key={webhook.id}
                    webhook={webhook}
                    onViewDetails={() => openDetailsDialog(webhook)}
                    onEdit={() => openEditDialog(webhook)}
                    onDelete={() => openDeleteDialog(webhook)}
                  />
                ))}
              </div>
            ) : (
              <WebhooksEmptyState onCreateWebhook={() => setCreateDialogOpen(true)} />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateWebhookModal
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        workspaceId={workspaceId}
        webhooks={webhooks || []}
        onWebhookCreated={handleWebhookCreated}
      />

      <EditWebhookModal
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        workspaceId={workspaceId}
        webhook={selectedWebhook}
      />

      <WebhookDetailsModal
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        webhook={selectedWebhook}
        workspaceId={workspaceId}
      />

      <DeleteWebhookModal
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        workspaceId={workspaceId}
        webhook={selectedWebhook}
      />
    </>
  );
};

export default WebhooksPage;
