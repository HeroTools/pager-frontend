export interface StartMigrationData {
  storageKey: string;
  filename: string;
  fileSize: number;
}

export interface MigrationResult {
  success: boolean;
  results: {
    usersCreated: number;
    channelsCreated: number;
    conversationsCreated: number;
    messagesImported: number;
    reactionsAdded: number;
    errors: string[];
  };
  message: string;
}

export interface MigrationStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  currentStep?: string;
  error?: string;
}
