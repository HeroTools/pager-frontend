export interface StartMigrationData {
  storageKey: string;
  filename: string;
  fileSize: number;
}

export interface MigrationJobResponse {
  success: boolean;
  jobId: string;
  message: string;
  estimatedProcessingTime: string;
}

export interface MigrationProgress {
  usersCreated: number;
  channelsCreated: number;
  conversationsCreated: number;
  messagesImported: number;
  reactionsAdded: number;
}

export interface MigrationJobStatus {
  jobId: string;
  workspaceId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: MigrationProgress;
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface MigrationJobStatusResponse {
  success: boolean;
  job: MigrationJobStatus;
}

export interface MigrationJobsResponse {
  success: boolean;
  jobs: MigrationJobStatus[];
}

// Legacy interface for backwards compatibility
export interface MigrationResult {
  success: boolean;
  results: MigrationProgress;
  message: string;
}
