'use client';

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  CloudUpload,
  FileText,
  Info,
  MessageSquare,
  RefreshCw,
  Smile,
  Upload,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMigrationJobs, useStartMigration } from '@/features/migration/hooks/use-migration';
import { useWorkspaceId } from '@/hooks/use-workspace-id';
import { supabase } from '@/lib/supabase/client';

export const MigrationImportPage = () => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();

  const [step, setStep] = useState<'upload' | 'uploading' | 'processing' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const migration = useStartMigration();
  const { data: allJobs, isLoading: jobsLoading } = useMigrationJobs(workspaceId);

  const formatTimeAgo = (date: Date | null) => {
    if (!date) return null;
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const handleBackClick = () => {
    router.push(`/${workspaceId}/settings`);
  };

  useEffect(() => {
    if (step === 'upload' && allJobs && !migration.isLoading && !jobsLoading) {
      const activeJob = allJobs.find(
        (job) => job.status === 'pending' || job.status === 'processing',
      );

      if (activeJob) {
        setStep('processing');
      }
    }
  }, [allJobs, step, migration.isLoading, jobsLoading]);

  useEffect(() => {
    if (migration.currentJob) {
      setLastUpdated(new Date());
      if (migration.currentJob.status === 'completed') {
        setStep('complete');
      } else if (migration.currentJob.status === 'failed') {
        setError(migration.currentJob.error || 'Migration failed');
        setStep('upload');
      } else if (
        migration.currentJob.status === 'processing' ||
        migration.currentJob.status === 'pending'
      ) {
        setStep('processing');
      }
    }
  }, [migration.currentJob]);

  const handleFileUpload = async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setStep('uploading');

    try {
      if (selectedFile.size > 100 * 1024 * 1024) {
        throw new Error(
          'File too large (max 100MB). Please contact support for larger migrations.',
        );
      }

      const timestamp = Date.now();
      const filename = `/${workspaceId}/slack-exports/${timestamp}-${selectedFile.name}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('files')
        .upload(filename, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      setStep('processing');

      await migration.mutateAsync({
        workspaceId,
        data: {
          storageKey: uploadData.path,
          filename: selectedFile.name,
          fileSize: selectedFile.size,
        },
      });
    } catch (err: any) {
      setError(err.message);
      setStep('upload');

      if (file) {
        const timestamp = Date.now();
        const filename = `/${workspaceId}/slack-exports/${timestamp}-${file.name}`;
        await supabase.storage
          .from('files')
          .remove([filename])
          .catch(() => {});
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.zip')) {
      handleFileUpload(droppedFile);
    } else {
      setError('Please upload a ZIP file');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileUpload(selectedFile);
    }
  };

  const handleRetry = () => {
    setError(null);
    setStep('upload');
    migration.reset();
  };

  if (step === 'upload') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="py-6 border-b">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={handleBackClick} className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Settings</span>
              <span>/</span>
              <span>Import</span>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Import from Slack</h1>
            <p className="text-base text-muted-foreground">
              Migrate your entire Slack workspace in minutes
            </p>
          </div>
        </div>

        <div className="py-8 space-y-8">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Migration Failed</div>
                  <div className="text-sm mt-1">{error}</div>
                  {error.includes('100MB') && (
                    <div className="text-xs mt-2 opacity-90">
                      For larger exports, please contact support
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={handleRetry} className="ml-4">
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-0">
                  <div
                    className={`border-2 border-dashed rounded-lg p-12 text-center transition-all cursor-pointer ${
                      isDragOver
                        ? 'border-primary bg-primary/5'
                        : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/20'
                    }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                  >
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>

                    <div className="space-y-3 mb-6">
                      <h3 className="text-xl font-semibold">
                        {isDragOver ? 'Drop your file here' : 'Drop your Slack export here'}
                      </h3>
                      <p className="text-muted-foreground">or click to browse for your ZIP file</p>
                      <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          Maximum size: 100MB
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          ZIP files only
                        </Badge>
                      </div>
                    </div>

                    <input
                      type="file"
                      accept=".zip"
                      onChange={handleInputChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload">
                      <Button asChild size="lg" className="font-medium">
                        <span>Choose File</span>
                      </Button>
                    </label>
                  </div>
                </CardContent>
              </Card>

              <Alert className="mt-6">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-medium">Before you start</div>
                    <div className="text-sm">
                      Make sure you have admin access to your Slack workspace to export data. The
                      migration usually takes between 1 and 15 minutes depending on your workspace
                      size. While we do our best to speed things up, it can take longer in some
                      cases. We appreciate your patience.
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    How to export from Slack
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { step: 1, text: 'Go to workspace settings', highlight: false },
                    { step: 2, text: 'Navigate to Import/Export Data', highlight: false },
                    { step: 3, text: "Click 'Export' then 'Start Export'", highlight: true },
                    { step: 4, text: 'Download the ZIP when ready', highlight: false },
                  ].map(({ step, text, highlight }) => (
                    <div key={step} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center flex-shrink-0">
                        {step}
                      </div>
                      <span className={`text-sm ${highlight ? 'font-medium' : ''}`}>{text}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold">What gets migrated</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { item: 'Users and profiles', icon: Users },
                    { item: 'All public channels', icon: MessageSquare },
                    { item: 'Message history', icon: FileText },
                    { item: 'Reactions & threads', icon: Smile },
                    { item: 'Channel memberships', icon: Users },
                    { item: 'Original timestamps', icon: Clock },
                  ].map(({ item, icon: Icon }) => (
                    <div key={item} className="flex items-center gap-3">
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'uploading') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <CloudUpload className="w-10 h-10 text-primary animate-pulse" />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold">Uploading File</h2>
            <p className="text-muted-foreground">
              Preparing <span className="font-medium">{file?.name}</span> for migration
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <span className="font-medium">Upload Progress</span>
              <Badge variant="secondary" className="text-xs">
                {(file?.size ? file.size / 1024 / 1024 : 0).toFixed(1)}MB
              </Badge>
            </div>

            <div className="w-full bg-muted rounded-full h-3 mb-6">
              <div className="bg-primary h-3 rounded-full transition-all duration-500 w-full animate-pulse" />
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span>Uploading to secure storage...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'processing') {
    const progress = migration.currentJob?.progress;
    const status = migration.currentJob?.status || 'pending';
    const activeJob = allJobs?.find(
      (job) => job.status === 'pending' || job.status === 'processing',
    );

    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-primary animate-spin" />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold">Processing Migration</h2>
            <p className="text-muted-foreground">This usually takes 5-15 minutes</p>
          </div>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Migration Progress</CardTitle>
                <div className="flex items-center gap-2">
                  {migration.isPolling ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                      <span className="text-xs text-primary font-medium">Updating...</span>
                    </div>
                  ) : lastUpdated ? (
                    <span className="text-xs text-muted-foreground">
                      Updated {formatTimeAgo(lastUpdated)}
                    </span>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      {status === 'pending' ? 'Pending' : 'Processing'}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {progress ? (
                <div className="space-y-4">
                  <div className="w-full bg-muted rounded-full h-3">
                    <div
                      className="bg-primary h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          ((progress.usersCreated +
                            progress.channelsCreated +
                            progress.messagesImported) /
                            100) *
                            100,
                          90,
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-lg font-semibold text-blue-500">
                        {progress.usersCreated}
                      </div>
                      <div className="text-xs text-muted-foreground">Users</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-green-500">
                        {progress.channelsCreated}
                      </div>
                      <div className="text-xs text-muted-foreground">Channels</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-orange-500">
                        {progress.messagesImported}
                      </div>
                      <div className="text-xs text-muted-foreground">Messages</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-purple-500">
                        {progress.reactionsAdded}
                      </div>
                      <div className="text-xs text-muted-foreground">Reactions</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full bg-muted rounded-full h-3">
                  <div className="bg-primary h-3 rounded-full animate-pulse w-1/4" />
                </div>
              )}

              <div className="text-center text-sm text-muted-foreground">
                Processing <span className="font-medium">{file?.name || 'your Slack export'}</span>
                {file?.size && <span> ({(file.size / 1024 / 1024).toFixed(1)}MB)</span>}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                icon: Users,
                label: 'Users',
                color: 'text-blue-500',
                bgColor: 'bg-blue-50',
                count: progress?.usersCreated || 0,
              },
              {
                icon: MessageSquare,
                label: 'Channels',
                color: 'text-green-500',
                bgColor: 'bg-green-50',
                count: progress?.channelsCreated || 0,
              },
              {
                icon: FileText,
                label: 'Messages',
                color: 'text-orange-500',
                bgColor: 'bg-orange-50',
                count: progress?.messagesImported || 0,
              },
              {
                icon: Smile,
                label: 'Reactions',
                color: 'text-purple-500',
                bgColor: 'bg-purple-50',
                count: progress?.reactionsAdded || 0,
              },
            ].map(({ icon: Icon, label, color, bgColor, count }) => (
              <Card key={label}>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div
                      className={`w-12 h-12 rounded-lg ${bgColor} flex items-center justify-center`}
                    >
                      <Icon className={`w-6 h-6 ${color}`} />
                    </div>
                    <div>
                      <div className="text-xl font-semibold">{count}</div>
                      <div className="text-xs text-muted-foreground">{label}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Migration continues in the background even if you close this page. You&apos;ll receive
              a notification when it&apos;s complete.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (step === 'complete') {
    const results = migration.data?.results;

    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold">Migration Complete!</h2>
            <p className="text-muted-foreground">
              Your Slack workspace has been imported successfully
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {results && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Migration Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-500">{results.usersCreated}</div>
                    <div className="text-sm text-muted-foreground">Users</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-500">
                      {results.channelsCreated}
                    </div>
                    <div className="text-sm text-muted-foreground">Channels</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-500">
                      {results.conversationsCreated}
                    </div>
                    <div className="text-sm text-muted-foreground">Conversations</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-500">
                      {results.messagesImported}
                    </div>
                    <div className="text-sm text-muted-foreground">Messages</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Next Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  'Invite team members with their original email addresses',
                  'Message history will automatically link to their accounts',
                  'Review channel permissions and workspace settings',
                ].map((step, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{step}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => router.push(`/${workspaceId}`)}
              size="lg"
              className="font-medium"
            >
              Go to Workspace
            </Button>
            <Button variant="outline" onClick={handleBackClick} size="lg">
              Back to Settings
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default MigrationImportPage;
