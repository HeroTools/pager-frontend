'use client';

import { ArrowLeft, RefreshCw, Settings, Upload, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { MigrationStatus } from '@/components/migration/migration-status';
import { PreferenceModal } from '@/components/side-nav/preference-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrentUser } from '@/features/auth';
import { useMigrationJobs } from '@/features/migration/hooks/use-migration';
import { useGetWorkspace } from '@/features/workspaces/hooks/use-workspaces';
import { useWorkspaceId } from '@/hooks/use-workspace-id';

const WorkspaceSettingsPage = () => {
  const [preferenceOpen, setPreferenceOpen] = useState(false);
  const router = useRouter();
  const workspaceId = useWorkspaceId();
  const { user, isLoading } = useCurrentUser(workspaceId);
  const { data: workspace } = useGetWorkspace(workspaceId);
  const { data: migrationJobs } = useMigrationJobs(workspaceId);

  const handleBackClick = () => {
    router.back();
  };

  const handleMigrationClick = () => {
    router.push(`/${workspaceId}/settings/import`);
  };

  // Check if there's an active migration
  const activeMigration = migrationJobs?.find(
    (job) => job.status === 'pending' || job.status === 'processing',
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Settings className="w-8 h-8 text-muted-foreground animate-spin" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Loading</h3>
            <p className="text-sm text-muted-foreground max-w-sm">Loading workspace settings...</p>
          </div>
        </div>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Settings className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Access Restricted</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Only workspace administrators can access settings.
            </p>
          </div>
          <Button variant="outline" onClick={handleBackClick} size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Workspace
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
        initialVlaue={workspace?.name}
      />

      <div className="max-w-2xl mx-auto">
        <div className="py-8 border-b border-border-subtle">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={handleBackClick}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="h-4 w-px bg-border-subtle" />
            <span className="text-sm text-text-subtle">Settings</span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Workspace Settings</h1>
            <p className="text-sm text-text-subtle">
              Manage preferences and data for {workspace?.name}
            </p>
          </div>
        </div>

        <div className="py-8 space-y-6">
          <div className="space-y-4">
            <Card className="border-border-subtle hover:border-border-default transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                    <Settings className="w-4 h-4 text-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-medium">Workspace Preferences</CardTitle>
                    <CardDescription className="text-xs text-text-subtle">
                      Update your workspace name and settings
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  onClick={() => setPreferenceOpen(true)}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                >
                  Edit Preferences
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border-subtle hover:border-border-default transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md flex items-center justify-center">
                    <Upload className="w-4 h-4 text-card-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-medium">Import Data</CardTitle>
                    <CardDescription className="text-xs text-text-subtle">
                      Migrate your team&apos;s data from Slack or other platforms
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                {activeMigration && (
                  <div className="p-4 rounded-lg bg-brand-blue/5 border border-brand-blue/20">
                    <div className="flex items-start gap-3">
                      <RefreshCw className="w-4 h-4 text-brand-blue animate-spin mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-brand-blue mb-1">
                          Migration in Progress
                        </h4>
                        <p className="text-xs text-brand-blue/80 leading-relaxed mb-3">
                          {activeMigration.status === 'pending'
                            ? 'Your migration is queued and will start shortly.'
                            : 'Your Slack data is being imported in the background.'}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/${workspaceId}/settings/import`)}
                          className="h-7 text-xs"
                        >
                          View Progress
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 rounded-lg bg-muted/50 border border-border-subtle">
                  <div className="flex items-start gap-3">
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-medium mb-1">Import from Slack</h4>
                        <p className="text-xs text-text-subtle leading-relaxed">
                          Upload your Slack export to migrate channels, messages, and team members.
                          Process runs in background and takes 5-15 minutes.
                        </p>
                      </div>
                      <Button onClick={handleMigrationClick} size="sm" disabled={!!activeMigration}>
                        {activeMigration ? 'Migration in Progress' : 'Start Import'}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-md bg-muted/30 border border-border-subtle">
                  <h5 className="text-xs font-medium text-foreground mb-2">Migration includes:</h5>
                  <div className="grid grid-cols-2 gap-1 text-xs text-text-subtle">
                    <div>✓ Users and profiles</div>
                    <div>✓ All channels</div>
                    <div>✓ Message history</div>
                    <div>✓ Reactions & threads</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Migration Status Component */}
            {migrationJobs && migrationJobs.length > 0 && (
              <MigrationStatus workspaceId={workspaceId} />
            )}

            <Card className="border-border-subtle opacity-60">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Team Management
                    </CardTitle>
                    <CardDescription className="text-xs text-text-subtle">
                      Manage workspace members and permissions
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Button variant="outline" size="sm" disabled>
                  Manage Members
                  <span className="ml-2 px-1.5 py-0.5 bg-muted rounded text-[10px] text-text-subtle">
                    Soon
                  </span>
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
