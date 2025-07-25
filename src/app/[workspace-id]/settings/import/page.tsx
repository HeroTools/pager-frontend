'use client';

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  CloudUpload,
  FileText,
  MessageSquare,
  Smile,
  Upload,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStartMigration } from '@/features/migration/hooks/use-migration';
import { useWorkspaceId } from '@/hooks/use-workspace-id';
import { supabase } from '@/lib/supabase/client';

export const MigrationImportPage = () => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();

  const [step, setStep] = useState<'upload' | 'uploading' | 'processing' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startMigration = useStartMigration();

  const handleBackClick = () => {
    router.push(`/${workspaceId}/settings`);
  };

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

      await startMigration.mutateAsync({
        workspaceId,
        data: {
          storageKey: uploadData.path,
          filename: selectedFile.name,
          fileSize: selectedFile.size,
        },
      });

      setStep('complete');

      await supabase.storage.from('files').remove([uploadData.path]);
    } catch (err: any) {
      console.error('Migration error:', err);
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
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.zip')) {
      handleFileUpload(droppedFile);
    } else {
      setError('Please upload a ZIP file');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileUpload(selectedFile);
    }
  };

  if (step === 'upload') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="py-8 border-b border-border-subtle">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={handleBackClick}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="h-4 w-px bg-border-subtle" />
            <span className="text-sm text-text-subtle">Settings</span>
            <div className="h-4 w-px bg-border-subtle" />
            <span className="text-sm text-text-subtle">Import</span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Import from Slack</h1>
            <p className="text-sm text-text-subtle">
              Migrate your entire Slack workspace in minutes
            </p>
          </div>
        </div>

        <div className="py-8 space-y-6">
          {error && (
            <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">Migration Failed</p>
                  <p className="text-sm text-destructive/80 mt-1">{error}</p>
                  {error.includes('100MB') && (
                    <p className="text-xs text-destructive/60 mt-2">
                      For larger exports, please contact support
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <Card className="border-border-subtle">
            <CardContent className="p-0">
              <div
                className="border-2 border-dashed border-border-subtle rounded-lg p-12 text-center hover:border-border-default hover:bg-muted/20 transition-all cursor-pointer"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                </div>

                <div className="space-y-2 mb-6">
                  <h3 className="text-lg font-medium">Drop your Slack export here</h3>
                  <p className="text-sm text-text-subtle">or click to browse for your ZIP file</p>
                  <p className="text-xs text-text-subtle">Maximum size: 100MB</p>
                </div>

                <input
                  type="file"
                  accept=".zip"
                  onChange={handleInputChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button asChild size="sm">
                    <span>Choose File</span>
                  </Button>
                </label>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-border-subtle">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium">How to export from Slack</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {[
                    { step: 1, text: 'Go to workspace settings' },
                    { step: 2, text: 'Navigate to Import/Export Data' },
                    { step: 3, text: "Click 'Export' then 'Start Export'" },
                    { step: 4, text: 'Download the ZIP when ready' },
                  ].map(({ step, text }) => (
                    <div key={step} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center flex-shrink-0">
                        {step}
                      </div>
                      <span className="text-sm text-foreground">{text}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border-subtle">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium">What gets migrated</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {[
                    'Users and profiles',
                    'All channels',
                    'Message history',
                    'Reactions & threads',
                    'Channel memberships',
                    'Original timestamps',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-brand-green flex-shrink-0" />
                      <span className="text-sm text-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'uploading') {
    return (
      <div className="max-w-lg mx-auto py-16">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-brand-blue/10 flex items-center justify-center mx-auto mb-6">
            <CloudUpload className="w-8 h-8 text-brand-blue animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Uploading File</h2>
            <p className="text-sm text-text-subtle">Preparing {file?.name} for migration...</p>
          </div>
        </div>

        <Card className="border-border-subtle">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium">Upload Progress</span>
              <span className="text-xs text-text-subtle">
                {(file?.size ? file.size / 1024 / 1024 : 0).toFixed(1)}MB
              </span>
            </div>

            <div className="w-full bg-muted rounded-full h-2 mb-4">
              <div className="bg-brand-blue h-2 rounded-full transition-all duration-300 w-full" />
            </div>

            <p className="text-center text-xs text-text-subtle">Uploading to secure storage...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'processing') {
    return (
      <div className="max-w-lg mx-auto py-16">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-brand-blue/10 flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-brand-blue animate-spin" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Processing Migration</h2>
            <p className="text-sm text-text-subtle">This usually takes 2-10 minutes</p>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="border-border-subtle">
            <CardContent className="p-6">
              <div className="w-full bg-muted rounded-full h-2 mb-4">
                <div className="bg-brand-blue h-2 rounded-full animate-pulse w-3/4" />
              </div>
              <p className="text-center text-xs text-text-subtle">
                Processing {file?.name} ({(file?.size ? file.size / 1024 / 1024 : 0).toFixed(1)}MB)
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Users, label: 'Users', color: 'text-brand-blue' },
              { icon: MessageSquare, label: 'Channels', color: 'text-brand-green' },
              { icon: FileText, label: 'Messages', color: 'text-text-warning' },
              { icon: Smile, label: 'Reactions', color: 'text-purple-500' },
            ].map(({ icon: Icon, label, color }) => (
              <Card key={label} className="border-border-subtle">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-6 h-6 ${color}`} />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-center text-xs text-text-subtle">
            Please keep this page open while processing
          </p>
        </div>
      </div>
    );
  }

  if (step === 'complete') {
    const results = startMigration.data?.results;

    return (
      <div className="max-w-lg mx-auto py-16">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-brand-green/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-brand-green" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Migration Complete</h2>
            <p className="text-sm text-text-subtle">
              Your Slack workspace has been imported successfully
            </p>
          </div>
        </div>

        {results && (
          <Card className="border-border-subtle mb-8">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-medium">Migration Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-xl font-semibold text-brand-blue">
                    {results.usersCreated}
                  </div>
                  <div className="text-xs text-text-subtle">Users</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-semibold text-brand-green">
                    {results.channelsCreated}
                  </div>
                  <div className="text-xs text-text-subtle">Channels</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-semibold text-indigo-500">
                    {results.conversationsCreated}
                  </div>
                  <div className="text-xs text-text-subtle">Conversations</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-semibold text-text-warning">
                    {results.messagesImported}
                  </div>
                  <div className="text-xs text-text-subtle">Messages</div>
                </div>
              </div>

              {results.errors && results.errors.length > 0 && (
                <div className="mt-4 p-3 bg-text-warning/5 border border-text-warning/20 rounded-lg">
                  <p className="text-xs font-medium text-text-warning">
                    {results.errors.length} items had issues during migration
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-border-subtle mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium">Next Steps</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {[
                'Invite team members with their original email addresses',
                'Message history will automatically link to their accounts',
                'Review channel permissions and workspace settings',
              ].map((step, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-brand-green flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground">{step}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-center">
          <Button onClick={() => router.push(`/${workspaceId}`)} size="sm">
            Go to Workspace
          </Button>
          <Button variant="outline" onClick={handleBackClick} size="sm">
            Back to Settings
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

export default MigrationImportPage;
