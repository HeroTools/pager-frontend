import { SearchFilters, SearchHistoryItem, SearchResult } from "./types";

// Search utilities
export class SearchUtils {
  static formatSearchQuery(query: string): string {
    return query.trim().toLowerCase();
  }

  static extractMentions(query: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(query)) !== null) {
      mentions.push(match[1]);
    }

    return mentions;
  }

  static extractChannels(query: string): string[] {
    const channelRegex = /#(\w+)/g;
    const channels: string[] = [];
    let match;

    while ((match = channelRegex.exec(query)) !== null) {
      channels.push(match[1]);
    }

    return channels;
  }

  static highlightText(text: string, query: string): string {
    if (!query.trim()) return text;

    const regex = new RegExp(
      `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi"
    );
    return text.replace(
      regex,
      '<mark class="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">$1</mark>'
    );
  }

  static calculateRelevanceScore(result: SearchResult, query: string): number {
    const words = query.toLowerCase().split(/\s+/);
    const content = result.content.toLowerCase();

    let score = result.similarity;

    // Boost for exact matches
    if (content.includes(query.toLowerCase())) {
      score += 0.2;
    }

    // Boost for word matches
    const wordMatches = words.filter((word) => content.includes(word)).length;
    score += (wordMatches / words.length) * 0.1;

    // Boost for recent messages
    const daysSinceMessage =
      (Date.now() - new Date(result.timestamp).getTime()) /
      (1000 * 60 * 60 * 24);
    if (daysSinceMessage < 7) {
      score += 0.05;
    }

    return Math.min(score, 1);
  }

  static groupResultsByContext(
    results: SearchResult[]
  ): Record<string, SearchResult[]> {
    return results.reduce((groups, result) => {
      const key = result.channelId
        ? `channel-${result.channelId}`
        : `conversation-${result.conversationId}`;

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(result);

      return groups;
    }, {} as Record<string, SearchResult[]>);
  }

  static generateSearchSuggestions(
    query: string,
    recentSearches: string[]
  ): string[] {
    const suggestions: string[] = [];

    // Add variations of current query
    if (query.length > 2) {
      suggestions.push(`${query} in:channel`);
      suggestions.push(`${query} from:me`);
      suggestions.push(`${query} has:link`);
    }

    // Add recent searches that match
    const matchingRecent = recentSearches
      .filter(
        (search) =>
          search.toLowerCase().includes(query.toLowerCase()) && search !== query
      )
      .slice(0, 3);

    suggestions.push(...matchingRecent);

    return suggestions.slice(0, 5);
  }

  static isAdvancedQuery(query: string): boolean {
    const advancedPatterns = [
      /in:\w+/,
      /from:\w+/,
      /has:\w+/,
      /before:\d{4}-\d{2}-\d{2}/,
      /after:\d{4}-\d{2}-\d{2}/,
      /@\w+/,
      /#\w+/,
    ];

    return advancedPatterns.some((pattern) => pattern.test(query));
  }

  static parseAdvancedQuery(query: string): {
    cleanQuery: string;
    filters: SearchFilters;
  } {
    let cleanQuery = query;
    const filters: SearchFilters = {};

    // Extract channel filter
    const channelMatch = query.match(/in:(\w+)/);
    if (channelMatch) {
      filters.channelId = channelMatch[1];
      cleanQuery = cleanQuery.replace(/in:\w+/g, "").trim();
    }

    // Extract author filter
    const authorMatch = query.match(/from:(\w+)/);
    if (authorMatch) {
      filters.authorId = authorMatch[1];
      cleanQuery = cleanQuery.replace(/from:\w+/g, "").trim();
    }

    // Extract date filters
    const beforeMatch = query.match(/before:(\d{4}-\d{2}-\d{2})/);
    const afterMatch = query.match(/after:(\d{4}-\d{2}-\d{2})/);

    if (beforeMatch || afterMatch) {
      filters.dateRange = {
        start: afterMatch ? new Date(afterMatch[1]) : new Date("1970-01-01"),
        end: beforeMatch ? new Date(beforeMatch[1]) : new Date(),
      };
      cleanQuery = cleanQuery
        .replace(/(before|after):\d{4}-\d{2}-\d{2}/g, "")
        .trim();
    }

    return { cleanQuery, filters };
  }
}

// Local storage helpers for search history
export class SearchHistory {
  private static readonly STORAGE_KEY = "search-history";
  private static readonly MAX_ITEMS = 50;

  static add(item: SearchHistoryItem): void {
    const history = this.get();
    const filtered = history.filter(
      (h) => h.query !== item.query || h.workspaceId !== item.workspaceId
    );

    filtered.unshift(item);

    const trimmed = filtered.slice(0, this.MAX_ITEMS);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmed));
  }

  static get(workspaceId?: string): SearchHistoryItem[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];

      const history = JSON.parse(stored) as SearchHistoryItem[];
      return workspaceId
        ? history.filter((item) => item.workspaceId === workspaceId)
        : history;
    } catch {
      return [];
    }
  }

  static clear(workspaceId?: string): void {
    if (workspaceId) {
      const history = this.get();
      const filtered = history.filter(
        (item) => item.workspaceId !== workspaceId
      );
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    } else {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  static getRecentQueries(workspaceId: string, limit = 5): string[] {
    return this.get(workspaceId)
      .slice(0, limit)
      .map((item) => item.query);
  }
}
