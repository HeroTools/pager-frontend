'use client';

import {
  ArrowLeft,
  Copy,
  Eye,
  EyeOff,
  Info,
  MoreHorizontal,
  Plus,
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
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useCurrentUser } from '@/features/auth';
import {
  useCreateWebhook,
  useDeleteWebhook,
  useWebhooks,
} from '@/features/webhooks/hooks/use-webhooks';
import { useWorkspaceId } from '@/hooks/use-workspace-id';

const WebhooksPage = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<any>(null);
  const [newWebhookName, setNewWebhookName] = useState('');
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const router = useRouter();
  const workspaceId = useWorkspaceId();
  const { user, isLoading: userLoading } = useCurrentUser(workspaceId);

  const { data: webhooks, isLoading, error } = useWebhooks(workspaceId);
  const createWebhook = useCreateWebhook(workspaceId);
  const deleteWebhook = useDeleteWebhook(workspaceId);

  const handleBackClick = () => router.push(`/${workspaceId}/settings`);

  const handleCreateWebhook = async () => {
    if (!newWebhookName.trim()) {
      toast.error('Please enter a webhook name');
      return;
    }

    try {
      const result = await createWebhook.mutateAsync({
        workspace_id: workspaceId,
        name: newWebhookName.trim(),
      });

      setSelectedWebhook(result);
      setDetailsDialogOpen(true);
      setCreateDialogOpen(false);
      setNewWebhookName('');
      toast.success('Webhook created successfully');
    } catch (error) {
      toast.error('Failed to create webhook');
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
                Webhooks allow external applications to post messages to your channels. Each webhook
                gets a unique URL and can be configured with custom usernames and avatars.
              </AlertDescription>
            </Alert>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  Failed to load webhooks. Please try refreshing the page.
                </AlertDescription>
              </Alert>
            )}

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
                {webhooks.map((webhook) => (
                  <Card key={webhook.id}>
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Webhook className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-semibold">{webhook.name}</CardTitle>
                            <CardDescription className="text-sm">
                              Created by {webhook.created_by_name} on{' '}
                              {formatDate(webhook.created_at)}
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
                          <span className="text-muted-foreground">Total Requests:</span>
                          <div className="font-medium">{webhook.total_requests || 0}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Last Used:</span>
                          <div className="font-medium">
                            {webhook.last_used_at ? formatDate(webhook.last_used_at) : 'Never'}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Status:</span>
                          <div className="font-medium">
                            {webhook.is_active ? 'Active' : 'Inactive'}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Webhook</DialogTitle>
            <DialogDescription>
              Give your webhook a descriptive name to identify its purpose.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="webhook-name">Webhook Name</Label>
              <Input
                id="webhook-name"
                placeholder="e.g., CI/CD Notifications, Support Alerts"
                value={newWebhookName}
                onChange={(e) => setNewWebhookName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateWebhook();
                  }
                }}
              />
            </div>
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
                  <Input
                    value={
                      selectedWebhook.url ||
                      `${window.location.origin}/api/webhooks/${selectedWebhook.id}`
                    }
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      copyToClipboard(
                        selectedWebhook.url ||
                          `${window.location.origin}/api/webhooks/${selectedWebhook.id}`,
                        'Webhook URL',
                      )
                    }
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {selectedWebhook.secret_token && (
                <div>
                  <Label>Secret Token (Optional)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type={showSecrets[selectedWebhook.id] ? 'text' : 'password'}
                      value={selectedWebhook.secret_token}
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
                      onClick={() => copyToClipboard(selectedWebhook.secret_token, 'Secret Token')}
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
                  rows={8}
                  value={`curl -X POST "${selectedWebhook.url || `${window.location.origin}/api/webhooks/${selectedWebhook.id}`}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "channel_id": "your-channel-id",
    "text": "Hello from webhook!",
    "username": "My Bot",
    "icon_url": "https://example.com/avatar.png"
  }'`}
                />
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Make sure to include a valid <code>channel_id</code> in your request. You can find
                  channel IDs in the URL when viewing a channel.
                </AlertDescription>
              </Alert>
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
