'use client';

import {
  ArrowLeft,
  Copy,
  Eye,
  EyeOff,
  Info,
  MoreHorizontal,
  Plus,
  Settings,
  Trash2,
  Webhook,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useCurrentUser } from '@/features/auth';
import { useGetUserChannels } from '@/features/channels/hooks/use-channels-mutations';
import {
  useCreateWebhook,
  useDeleteWebhook,
  useUpdateWebhook,
  useWebhooks,
} from '@/features/webhooks/hooks/use-webhooks';
import { useWorkspaceId } from '@/hooks/use-workspace-id';

const SOURCE_TYPE_INFO = {
  custom: {
    label: 'Custom',
    description: 'General purpose webhooks for custom integrations',
    icon: '🔗',
    maxAllowed: 2,
    requiresChannel: false,
  },
  github: {
    label: 'GitHub',
    description: 'GitHub repository events and notifications',
    icon: '🐙',
    maxAllowed: 1,
    requiresChannel: true,
  },
  linear: {
    label: 'Linear',
    description: 'Linear issue tracking and project updates',
    icon: '📐',
    maxAllowed: 1,
    requiresChannel: true,
  },
  jira: {
    label: 'Jira',
    description: 'Jira issue tracking and project management',
    icon: '🔷',
    maxAllowed: 1,
    requiresChannel: true,
  },
};

const WebhooksPage = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<any>(null);
  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookSourceType, setNewWebhookSourceType] = useState<string>('custom');
  const [newWebhookChannelId, setNewWebhookChannelId] = useState<string>('');
  const [newWebhookSigningSecret, setNewWebhookSigningSecret] = useState<string>('');
  const [editWebhookName, setEditWebhookName] = useState('');
  const [editWebhookChannelId, setEditWebhookChannelId] = useState<string>('');
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const router = useRouter();
  const workspaceId = useWorkspaceId();
  const { user, isLoading: userLoading } = useCurrentUser(workspaceId);

  const { data: webhooks, isLoading, error } = useWebhooks(workspaceId);
  const { data: channels } = useGetUserChannels(workspaceId);
  const createWebhook = useCreateWebhook(workspaceId);
  const updateWebhook = useUpdateWebhook(workspaceId);
  const deleteWebhook = useDeleteWebhook(workspaceId);

  const handleBackClick = () => router.push(`/${workspaceId}/settings`);

  const getWebhookCounts = () => {
    if (!webhooks) return {};
    return webhooks.reduce(
      (acc, webhook) => {
        acc[webhook.source_type] = (acc[webhook.source_type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  };

  const canCreateWebhook = (sourceType: string) => {
    const counts = getWebhookCounts();
    const info = SOURCE_TYPE_INFO[sourceType as keyof typeof SOURCE_TYPE_INFO];
    return (counts[sourceType] || 0) < info.maxAllowed;
  };

  const handleCreateWebhook = async () => {
    if (!newWebhookName.trim()) {
      toast.error('Please enter a webhook name');
      return;
    }

    const sourceTypeInfo = SOURCE_TYPE_INFO[newWebhookSourceType as keyof typeof SOURCE_TYPE_INFO];

    if (sourceTypeInfo.requiresChannel && !newWebhookChannelId) {
      toast.error('Please select a channel for this webhook type');
      return;
    }

    if (sourceTypeInfo.requiresChannel && !newWebhookSigningSecret.trim()) {
      toast.error('Please enter the signing secret provided by the service');
      return;
    }

    if (!canCreateWebhook(newWebhookSourceType)) {
      toast.error(`Maximum number of ${sourceTypeInfo.label} webhooks reached`);
      return;
    }

    try {
      const result = await createWebhook.mutateAsync({
        workspace_id: workspaceId,
        name: newWebhookName.trim(),
        source_type: newWebhookSourceType,
        channel_id: sourceTypeInfo.requiresChannel ? newWebhookChannelId : undefined,
        signing_secret: sourceTypeInfo.requiresChannel ? newWebhookSigningSecret.trim() : undefined,
      });

      setSelectedWebhook(result);
      setDetailsDialogOpen(true);
      setCreateDialogOpen(false);
      setNewWebhookName('');
      setNewWebhookSourceType('custom');
      setNewWebhookChannelId('');
      setNewWebhookSigningSecret('');
      toast.success('Webhook created successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create webhook');
    }
  };

  const handleEditWebhook = async () => {
    if (!selectedWebhook) return;

    const updates: any = {};

    if (editWebhookName.trim() !== selectedWebhook.name) {
      updates.name = editWebhookName.trim();
    }

    if (editWebhookChannelId !== selectedWebhook.channel_id) {
      updates.channel_id = editWebhookChannelId || null;
    }

    if (Object.keys(updates).length === 0) {
      setEditDialogOpen(false);
      return;
    }

    try {
      await updateWebhook.mutateAsync({
        webhookId: selectedWebhook.id,
        data: updates,
      });
      setEditDialogOpen(false);
      setSelectedWebhook(null);
      toast.success('Webhook updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update webhook');
    }
  };

  const handleDeleteWebhook = async () => {
    if (!selectedWebhook) return;

    try {
      await deleteWebhook.mutateAsync(selectedWebhook.id);
      setDeleteDialogOpen(false);
      setSelectedWebhook(null);
      toast.success('Webhook deleted successfully');
    } catch (error) {
      toast.error('Failed to delete webhook');
    }
  };

  const openEditDialog = (webhook: any) => {
    setSelectedWebhook(webhook);
    setEditWebhookName(webhook.name);
    setEditWebhookChannelId(webhook.channel_id || '');
    setEditDialogOpen(true);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const toggleSecretVisibility = (webhookId: string) => {
    setShowSecrets((prev) => ({
      ...prev,
      [webhookId]: !prev[webhookId],
    }));
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

  const getExamplePayload = (sourceType: string) => {
    if (sourceType === 'custom') {
      return `{
  "channel_id": "your-channel-id",
  "text": "Hello from webhook!",
  "username": "My Bot",
  "icon_url": "https://example.com/avatar.png"
}`;
    }
    return `// Configure this URL in your ${SOURCE_TYPE_INFO[sourceType as keyof typeof SOURCE_TYPE_INFO]?.label} webhook settings
// Events will automatically be posted to the configured channel`;
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
                posting, while service webhooks automatically format events from GitHub, Linear, and
                Jira.
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(SOURCE_TYPE_INFO).map(([key, info]) => (
                <Card key={key} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{info.icon}</span>
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
                  const channel = channels?.find((c) => c.id === webhook.channel_id);

                  return (
                    <Card key={webhook.id}>
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                              <span className="text-lg">{sourceInfo?.icon || '🔗'}</span>
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
                                {channel && <span className="ml-2">• #{channel.name}</span>}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={webhook.is_active ? 'default' : 'secondary'}>
                              {webhook.is_active ? 'Active' : 'Inactive'}
                            </Badge>
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

      {/* Create Webhook Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Webhook</DialogTitle>
            <DialogDescription>
              Choose the type of webhook and configure its settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="webhook-type">Webhook Type</Label>
              <Select value={newWebhookSourceType} onValueChange={setNewWebhookSourceType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SOURCE_TYPE_INFO).map(([key, info]) => (
                    <SelectItem key={key} value={key} disabled={!canCreateWebhook(key)}>
                      <div className="flex items-center gap-2">
                        <span>{info.icon}</span>
                        <div>
                          <div className="font-medium">{info.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {info.description}
                            {!canCreateWebhook(key) && ' (Limit reached)'}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="webhook-name">Webhook Name</Label>
              <Input
                id="webhook-name"
                placeholder="e.g., CI/CD Notifications, Support Alerts"
                value={newWebhookName}
                onChange={(e) => setNewWebhookName(e.target.value)}
              />
            </div>

            {SOURCE_TYPE_INFO[newWebhookSourceType as keyof typeof SOURCE_TYPE_INFO]
              ?.requiresChannel && (
              <>
                <div>
                  <Label htmlFor="webhook-channel">Target Channel</Label>
                  <Select value={newWebhookChannelId} onValueChange={setNewWebhookChannelId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a channel" />
                    </SelectTrigger>
                    <SelectContent>
                      {channels?.map((channel) => (
                        <SelectItem key={channel.id} value={channel.id}>
                          #{channel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="webhook-signing-secret">
                    Signing Secret
                    <span className="text-xs text-muted-foreground ml-1">
                      (from your{' '}
                      {
                        SOURCE_TYPE_INFO[newWebhookSourceType as keyof typeof SOURCE_TYPE_INFO]
                          ?.label
                      }{' '}
                      webhook settings)
                    </span>
                  </Label>
                  <Input
                    id="webhook-signing-secret"
                    type="password"
                    placeholder="Enter the signing secret provided by the service"
                    value={newWebhookSigningSecret}
                    onChange={(e) => setNewWebhookSigningSecret(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateWebhook}
              disabled={createWebhook.isPending || !newWebhookName.trim()}
            >
              {createWebhook.isPending ? 'Creating...' : 'Create Webhook'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Webhook Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Webhook</DialogTitle>
            <DialogDescription>Update webhook settings.</DialogDescription>
          </DialogHeader>
          {selectedWebhook && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-webhook-name">Webhook Name</Label>
                <Input
                  id="edit-webhook-name"
                  value={editWebhookName}
                  onChange={(e) => setEditWebhookName(e.target.value)}
                />
              </div>

              {selectedWebhook.source_type !== 'custom' && (
                <div>
                  <Label htmlFor="edit-webhook-channel">Target Channel</Label>
                  <Select value={editWebhookChannelId} onValueChange={setEditWebhookChannelId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a channel" />
                    </SelectTrigger>
                    <SelectContent>
                      {channels?.map((channel) => (
                        <SelectItem key={channel.id} value={channel.id}>
                          #{channel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditWebhook} disabled={updateWebhook.isPending}>
              {updateWebhook.isPending ? 'Updating...' : 'Update Webhook'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Webhook Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Webhook Details</DialogTitle>
            <DialogDescription>
              Use these credentials to configure your external application.
            </DialogDescription>
          </DialogHeader>
          {selectedWebhook && (
            <div className="space-y-6">
              <div>
                <Label>Webhook URL</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input value={selectedWebhook.url} readOnly className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(selectedWebhook.url, 'Webhook URL')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {selectedWebhook.signing_secret && (
                <div>
                  <Label>Signing Secret</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type={showSecrets[selectedWebhook.id] ? 'text' : 'password'}
                      value={selectedWebhook.signing_secret}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleSecretVisibility(selectedWebhook.id)}
                    >
                      {showSecrets[selectedWebhook.id] ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        copyToClipboard(selectedWebhook.signing_secret, 'Signing Secret')
                      }
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <Label>Example Usage</Label>
                <Textarea
                  readOnly
                  className="mt-1 font-mono text-sm"
                  rows={selectedWebhook.source_type === 'custom' ? 8 : 4}
                  value={
                    selectedWebhook.source_type === 'custom'
                      ? `curl -X POST "${selectedWebhook.url}" \\
  -H "Content-Type: application/json" \\
  -d '${getExamplePayload(selectedWebhook.source_type)}'`
                      : getExamplePayload(selectedWebhook.source_type)
                  }
                />
              </div>

              {selectedWebhook.source_type === 'custom' && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Custom webhooks require a <code>channel_id</code> in each request. You can find
                    channel IDs in the URL when viewing a channel.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Webhook Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Webhook</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedWebhook?.name}"? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteWebhook}
              disabled={deleteWebhook.isPending}
            >
              {deleteWebhook.isPending ? 'Deleting...' : 'Delete Webhook'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WebhooksPage;
