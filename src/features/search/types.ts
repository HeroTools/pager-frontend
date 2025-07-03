/** A single numbered citation back to a message */
export interface Reference {
  /** The ID of the message being cited */
  messageId: string;
  /** Citation number matching [index] in the answer */
  index: number;
}

/** One search hit with all its metadata and context IDs */
export interface SearchResult {
  messageId: string;
  content: string;
  similarity: number;
  timestamp: string; // ISO timestamp
  authorName: string;
  authorImage?: string | null;
  channelId?: string | null;
  channelName?: string | null;
  conversationId?: string | null;
  isThread: boolean;
  parentMessageId?: string | null;
  threadSummary?: string | null;
  contextType: "channel" | "conversation" | "thread";
  contextMessageIds: string[];
}

/** The full response shape from `/search` */
export interface SearchResponse {
  /** AI‐generated answer in Markdown, with inline [n] citations */
  answer: string;
  /** Maps each citation number back to its messageId */
  references: Reference[];
  /** The array of raw matching messages */
  results: SearchResult[];
  /** Same as `results.length` */
  totalCount: number;
  /** Echo of the user’s original query */
  query: string;
  /** Milliseconds elapsed on the server */
  executionTime: number;
}

/**
 * Options to customize the semantic search request
 */
export interface UseSearchOptions {
  includeThreads?: boolean;
  channelId?: string;
  conversationId?: string;
  limit?: number;
}

export interface SearchFilters {
  channelId?: string;
  conversationId?: string;
  authorId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  messageType?: "all" | "threads" | "direct" | "channel";
}

export interface SearchMetrics {
  totalResults: number;
  executionTime: number;
  hasAIAnswer: boolean;
  averageSimilarity: number;
  topSimilarity: number;
}

export interface EnhancedSearchResponse extends SearchResponse {
  metrics: SearchMetrics;
  suggestedQueries?: string[];
  filters: SearchFilters;
}

// Search history for better UX
export interface SearchHistoryItem {
  query: string;
  timestamp: Date;
  resultCount: number;
  workspaceId: string;
}
