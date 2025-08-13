'use client';

import { ArrowLeft, Info, MoreHorizontal, Plus, Settings, Trash2, Webhook } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

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
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/features/auth';
import {
  CreateWebhookModal,
  DeleteWebhookModal,
  EditWebhookModal,
  WebhookDetailsModal,
} from '@/features/webhooks/components';
import { useWebhooks } from '@/features/webhooks/hooks/use-webhooks';
import { type Webhook as WebhookType } from '@/features/webhooks/types';
import { useWorkspaceId } from '@/hooks/use-workspace-id';

const ServiceIcon = ({ type, className = 'w-6 h-6' }: { type: string; className?: string }) => {
  const iconMap = {
    custom: <Webhook className={className} />,
    github: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    ),
    linear: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.125 16.5L12 22.625 5.875 16.5 12 1.375 18.125 16.5z" />
      </svg>
    ),
    jira: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.34V2.84A.84.84 0 0 0 21.16 2H11.53zM6.77 6.8c0 2.4 1.94 4.34 4.34 4.34h1.8v1.72c0 2.38 1.96 4.34 4.34 4.34V7.63a.84.84 0 0 0-.83-.83H6.77zM2 11.6c0 2.4 1.95 4.34 4.35 4.34h1.78v1.72c0 2.4 1.94 4.34 4.34 4.34v-9.57a.83.83 0 0 0-.83-.83H2z" />
      </svg>
    ),
    stripe: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
      </svg>
    ),
  };

  return iconMap[type as keyof typeof iconMap] || iconMap.custom;
};

const SOURCE_TYPE_INFO = {
  custom: {
    label: 'Custom',
    description: 'General purpose webhooks for custom integrations',
    maxAllowed: 5,
    requiresChannel: false,
  },
  github: {
    label: 'GitHub',
    description: 'GitHub repository events and notifications',
    maxAllowed: 5,
    requiresChannel: true,
  },
  linear: {
    label: 'Linear',
    description: 'Linear issue tracking and project updates',
    maxAllowed: 5,
    requiresChannel: true,
  },
  jira: {
    label: 'Jira',
    description: 'Jira issue tracking and project management',
    maxAllowed: 5,
    requiresChannel: true,
  },
  stripe: {
    label: 'Stripe',
    description: 'Stripe payment events and subscription updates',
    maxAllowed: 5,
    requiresChannel: true,
  },
};

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

  const handleBackClick = () => router.push(`/${workspaceId}/settings`);

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-4xl space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
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
          <Button variant="outline" onClick={handleBackClick} size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Settings
          </Button>
        </div>
      </div>
    );
  }

  const webhookCounts = getWebhookCounts();

  return (
    <>
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
        <div className="py-4 sm:py-6">
          <div className="flex items-center gap-2 mb-3">
            <Button variant="ghost" size="icon" onClick={handleBackClick} className="h-8 w-8">
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
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Create webhooks for external integrations. Custom webhooks allow flexible message
                posting, while service webhooks automatically format events from GitHub, Linear,
                Jira, and Stripe.
              </AlertDescription>
            </Alert>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  Failed to load webhooks. Please try refreshing the page.
                </AlertDescription>
              </Alert>
            )}

            {/* Webhook Limits Info */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(SOURCE_TYPE_INFO).map(([key, info]) => (
                <Card key={key} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ServiceIcon type={key} className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium text-sm">{info.label}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {webhookCounts[key] || 0} / {info.maxAllowed}
                  </div>
                </Card>
              ))}
            </div>

            {isLoading ? (
              <div className="grid gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : webhooks && webhooks.length > 0 ? (
              <div className="grid gap-4">
                {webhooks.map((webhook) => {
                  const sourceInfo =
                    SOURCE_TYPE_INFO[webhook.source_type as keyof typeof SOURCE_TYPE_INFO];

                  return (
                    <Card key={webhook.id}>
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                              <ServiceIcon
                                type={webhook.source_type}
                                className="w-6 h-6 text-blue-600"
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <CardTitle className="text-lg font-semibold">
                                  {webhook.name}
                                </CardTitle>
                                <Badge variant="outline" className="text-xs">
                                  {sourceInfo?.label || webhook.source_type}
                                </Badge>
                              </div>
                              <CardDescription className="text-sm">
                                Created by {webhook.created_by_name} on{' '}
                                {formatDate(webhook.created_at)}
                                {webhook.channel_name && (
                                  <span className="ml-2">• #{webhook.channel_name}</span>
                                )}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {webhook.source_type === 'stripe' && !webhook.signing_secret ? (
                              <Badge variant="outline" className="text-amber-600 border-amber-200">
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
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedWebhook(webhook);
                                    setDetailsDialogOpen(true);
                                  }}
                                >
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditDialog(webhook)}>
                                  <Settings className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedWebhook(webhook);
                                    setDeleteDialogOpen(true);
                                  }}
                                  className="text-destructive"
                                >
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
                          <Alert className="border-amber-200 bg-amber-50">
                            <Info className="h-4 w-4 text-amber-600" />
                            <AlertDescription className="text-amber-800">
                              <strong>Setup Required:</strong> Add the webhook URL to your Stripe Dashboard, 
                              then edit this webhook to add the signing secret to enable events.
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
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Webhook className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No webhooks yet</h3>
                  <p className="text-muted-foreground text-center mb-4 max-w-md">
                    Create your first webhook to start integrating external services with your
                    workspace.
                  </p>
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Webhook
                  </Button>
                </CardContent>
              </Card>
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
