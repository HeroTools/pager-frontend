'use client';

import {
  ArrowLeft,
  CheckCircle2,
  Info,
  Plug,
  RefreshCw,
  Settings,
  Upload,
  Users,
  Webhook,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { PreferenceModal } from '@/components/side-nav/preference-modal';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/features/auth';
import { MigrationStatus } from '@/features/migration/components/migration-status';
import { useMigrationJobs } from '@/features/migration/hooks/use-migration';
import { useGetWorkspace } from '@/features/workspaces/hooks/use-workspaces';
import { useWorkspaceId } from '@/hooks/use-workspace-id';

const WorkspaceSettingsPage = () => {
  const [preferenceOpen, setPreferenceOpen] = useState(false);
  const router = useRouter();
  const workspaceId = useWorkspaceId();

  const { user, isLoading } = useCurrentUser(workspaceId);
  const { data: workspace } = useGetWorkspace(workspaceId);
  const { data: migrationJobs, isLoading: jobsLoading } = useMigrationJobs(workspaceId);

  const handleBackClick = () => router.back();
  const handleMigrationClick = () => router.push(`/${workspaceId}/settings/import`);
  const handleWebhooksClick = () => router.push(`/${workspaceId}/settings/webhooks`);
  const handleMcpClick = () => router.push(`/${workspaceId}/settings/integrations/mcp`);

  const activeMigration = useMemo(
    () => migrationJobs?.find((j) => j.status === 'pending' || j.status === 'processing'),
    [migrationJobs],
  );

  const hasCompletedMigrations = useMemo(
    () => migrationJobs?.some((j) => j.status === 'completed'),
    [migrationJobs],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-3xl space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground animate-spin" />
            <p className="text-sm text-muted-foreground">Loading workspace settings…</p>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-7 w-7" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-64" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Skeleton className="h-8 w-28" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-7 w-7" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-56" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-8 w-28" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Settings className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold">Access Restricted</h3>
          <p className="text-sm text-muted-foreground">
            Only workspace administrators can access settings.
          </p>
          <Button variant="outline" onClick={handleBackClick} size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <PreferenceModal
        open={preferenceOpen}
        setOpen={setPreferenceOpen}
        initialValue={workspace?.name}
      />

      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
        <div className="py-4 sm:py-6">
          <div className="flex items-center gap-2 mb-3">
            <Button variant="ghost" size="icon" onClick={handleBackClick} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs sm:text-sm text-muted-foreground">Settings</span>
          </div>
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">
              Workspace Settings
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage preferences and data for <span className="font-medium">{workspace?.name}</span>
            </p>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Upload className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold">Import Data</CardTitle>
                      <CardDescription className="text-sm">
                        Bring messages and channels from Slack (zip export)
                      </CardDescription>
                    </div>
                  </div>
                  {hasCompletedMigrations && !activeMigration && (
                    <Badge variant="secondary" className="text-xs">
                      Previously imported
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {activeMigration && (
                  <Alert>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <AlertDescription className="ml-2">
                      <div className="space-y-1">
                        <div className="font-medium">Migration in progress</div>
                        <div className="text-xs text-muted-foreground">
                          {activeMigration.status === 'pending'
                            ? 'Queued and will start shortly'
                            : 'Importing your Slack export in the background'}
                          . Job ID: {activeMigration.jobId}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="rounded-lg border bg-muted/20 p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <Info className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">
                      Most imports complete within 5–15 minutes. You can continue working while it
                      runs.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      'Users and profiles',
                      'Public channels',
                      'Message history',
                      'Reactions & threads',
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleMigrationClick}
                    size="default"
                    disabled={!!activeMigration || jobsLoading}
                  >
                    {activeMigration ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Migration in progress
                      </>
                    ) : jobsLoading ? (
                      'Loading…'
                    ) : hasCompletedMigrations ? (
                      'Import again'
                    ) : (
                      'Start import'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Plug className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold">MCP Integrations</CardTitle>
                    <CardDescription className="text-sm">
                      Connect AI agents to external tools via Model Context Protocol
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-muted/20 p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <Info className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">
                      Enable your AI agents to securely access external services like Linear,
                      GitHub, Notion, and more through standardized MCP connections.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      'Secure external tool access',
                      'Per-agent permissions',
                      'Popular service presets',
                      'Custom server support',
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-purple-600" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button onClick={handleMcpClick} size="default" className="font-medium">
                  Manage MCP connections
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Webhook className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold">Webhooks</CardTitle>
                    <CardDescription className="text-sm">
                      Integrate external services and automate message posting
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-muted/20 p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <Info className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">
                      Create webhooks to allow external applications to post messages to your
                      channels.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      'POST messages to channels',
                      'Custom usernames & avatars',
                      'Rich text formatting',
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button onClick={handleWebhooksClick} size="default" className="font-medium">
                  Manage webhooks
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Settings className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold">Workspace Preferences</CardTitle>
                    <CardDescription className="text-sm">
                      Update your workspace name or delete your workspace
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setPreferenceOpen(true)}
                  variant="outline"
                  size="default"
                  className="font-medium"
                >
                  Edit preferences
                </Button>
              </CardContent>
            </Card>

            {migrationJobs && migrationJobs.length > 0 && (
              <MigrationStatus workspaceId={workspaceId} />
            )}

            <Card className="opacity-75">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Users className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-muted-foreground">
                        Team Management
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Manage workspace members and permissions
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Coming soon
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="default" disabled className="font-medium">
                  Manage members
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default WorkspaceSettingsPage;
