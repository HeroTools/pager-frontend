// components/migration/migration-status.tsx
'use client';

import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMigrationJobs } from '@/features/migration/hooks/use-migration';
import type { MigrationJobStatus } from '@/features/migration/types';

interface MigrationStatusProps {
  workspaceId: string;
}

export const MigrationStatus = ({ workspaceId }: MigrationStatusProps) => {
  const { data: jobs, isLoading, refetch } = useMigrationJobs(workspaceId);

  if (isLoading) {
    return (
      <Card className="border-border-subtle">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading migration history...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!jobs || jobs.length === 0) {
    return null;
  }

  const getStatusIcon = (status: MigrationJobStatus['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-brand-green" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'processing':
        return <RefreshCw className="w-4 h-4 text-brand-blue animate-spin" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-text-warning" />;
      default:
        return <Clock className="w-4 h-4 text-text-subtle" />;
    }
  };

  const getStatusBadge = (status: MigrationJobStatus['status']) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="secondary" className="bg-brand-green/10 text-brand-green">
            Completed
          </Badge>
        );
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'processing':
        return (
          <Badge variant="secondary" className="bg-brand-blue/10 text-brand-blue">
            Processing
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-text-warning/10 text-text-warning">
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="border-border-subtle">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Migration History</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-8 w-8 p-0">
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {jobs.slice(0, 5).map((job) => (
            <div
              key={job.jobId}
              className="flex items-center justify-between p-3 rounded-lg border border-border-subtle"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(job.status)}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(job.status)}
                    <span className="text-xs text-text-subtle">
                      {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                    </span>
                  </div>

                  {job.progress && job.status === 'completed' && (
                    <div className="text-xs text-text-subtle">
                      {job.progress.usersCreated} users, {job.progress.channelsCreated} channels,{' '}
                      {job.progress.messagesImported} messages
                    </div>
                  )}

                  {job.progress && job.status === 'processing' && (
                    <div className="text-xs text-text-subtle">
                      Processing: {job.progress.messagesImported} messages imported
                    </div>
                  )}

                  {job.error && job.status === 'failed' && (
                    <div className="text-xs text-destructive">{job.error}</div>
                  )}
                </div>
              </div>

              <div className="text-xs text-text-subtle font-mono">{job.jobId.slice(0, 8)}...</div>
            </div>
          ))}

          {jobs.length > 5 && (
            <div className="text-center">
              <Button variant="ghost" size="sm" className="text-xs">
                View all {jobs.length} migrations
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
