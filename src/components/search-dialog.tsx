import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, ExternalLink, Filter, Search, Sparkles, TrendingUp, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDebounce } from 'use-debounce';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useSearch } from '@/features/search/hooks/use-search';
import { useGetAllAvailableChannels } from '@/features/channels/hooks/use-channels-mutations';
import { SearchHistory, SearchUtils } from '@/features/search/utils';
import type { SearchFilters, SearchResult } from '@/features/search/types';

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  initialQuery?: string;
}

const SearchResultCard = ({
  result,
  query,
  onNavigate,
  isReferenced = false,
}: {
  result: SearchResult;
  query: string;
  onNavigate: (messageId: string) => void;
  isReferenced?: boolean;
}) => {
  const highlightedContent = useMemo(
    () => SearchUtils.highlightText(result.content, query),
    [result.content, query],
  );

  return (
    <div
      className={`p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors ${
        isReferenced ? 'ring-2 ring-brand-blue/30 bg-brand-blue/5' : ''
      }`}
      onClick={() => onNavigate(result.messageId)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-sm">{result.authorName}</span>
            {isReferenced && (
              <Badge variant="outline" className="text-xs bg-brand-blue/10">
                Referenced in AI answer
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              in {result.channelName || 'Direct Message'}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(result.timestamp).toLocaleDateString()}
            </span>
          </div>

          <div
            className="text-sm leading-relaxed [&_mark]:bg-yellow-200 [&_mark]:dark:bg-yellow-800 [&_mark]:px-0.5 [&_mark]:rounded"
            dangerouslySetInnerHTML={{ __html: highlightedContent }}
          />

          {result.isThread && (
            <Badge variant="secondary" className="mt-2 text-xs">
              Part of thread
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{Math.round(result.similarity * 100)}% match</span>
          <ExternalLink className="size-3" />
        </div>
      </div>
    </div>
  );
};

const AIAnswerCard = ({
  answer,
  references,
  onReferenceClick,
}: {
  answer: string;
  references: { messageId: string; index: number }[];
  onReferenceClick: (messageId: string) => void;
}) => {
  const processAnswer = useCallback(
    (text: string) => {
      return text.replace(/\[(\d+)\]/g, (match, num) => {
        const ref = references.find((r) => r.index === parseInt(num));
        if (ref) {
          return `<button class="citation-link text-brand-blue hover:underline font-medium" data-message-id="${ref.messageId}">[${num}]</button>`;
        }
        return match;
      });
    },
    [references],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('citation-link')) {
        const messageId = target.getAttribute('data-message-id');
        if (messageId) {
          onReferenceClick(messageId);
        }
      }
    },
    [onReferenceClick],
  );

  return (
    <div className="p-4 bg-gradient-to-r from-brand-blue/5 to-brand-green/5 border border-brand-blue/20 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="size-5 text-brand-blue" />
        <h3 className="font-semibold text-brand-blue">AI Summary</h3>
      </div>
      <div
        className="prose prose-sm max-w-none [&_.citation-link]:cursor-pointer"
        dangerouslySetInnerHTML={{ __html: processAnswer(answer) }}
        onClick={handleClick}
      />
    </div>
  );
};

export const SearchDialog = ({
  open,
  onOpenChange,
  workspaceId,
  initialQuery = '',
}: SearchDialogProps) => {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [debouncedQuery] = useDebounce(query, 400);

  const { data: channels } = useGetAllAvailableChannels(workspaceId);

  const searchOptions = useMemo(() => {
    const options: any = {
      includeThreads: filters.messageType !== 'direct',
      limit: 20,
    };

    if (filters.channelId) {
      options.channelId = filters.channelId;
    }

    if (filters.conversationId) {
      options.conversationId = filters.conversationId;
    }

    return options;
  }, [filters]);

  const {
    data: searchData,
    isLoading,
    error,
  } = useSearch(workspaceId, debouncedQuery, searchOptions);

  const referencedMessageIds = useMemo(
    () => new Set(searchData?.references?.map((ref) => ref.messageId) || []),
    [searchData?.references],
  );

  const recentSearches = useMemo(() => SearchHistory.getRecentQueries(workspaceId), [workspaceId]);

  const handleNavigate = useCallback(
    (messageId: string) => {
      if (query.trim()) {
        SearchHistory.add({
          query: query.trim(),
          timestamp: new Date(),
          resultCount: searchData?.results?.length || 0,
          workspaceId,
        });
      }

      onOpenChange(false);
      router.push(`/${workspaceId}/m-${messageId}`);
    },
    [query, searchData?.results?.length, workspaceId, onOpenChange, router],
  );

  const handleRecentSearchClick = useCallback((recentQuery: string) => {
    setQuery(recentQuery);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  const hasActiveFilters = Object.keys(filters).some(
    (key) => filters[key as keyof SearchFilters] !== undefined,
  );

  const hasResults = searchData?.results && searchData.results.length > 0;
  const showRecentSearches = !debouncedQuery && recentSearches.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Search className="size-5" />
            Advanced Search
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for messages, files, or conversations..."
              className="pl-10 pr-10"
              autoFocus
            />
            {query && (
              <Button
                size="sm"
                variant="ghost"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 size-8 p-0"
                onClick={() => setQuery('')}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="size-4" />
              Filters
              {hasActiveFilters && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {Object.keys(filters).filter((key) => filters[key as keyof SearchFilters]).length}
                </Badge>
              )}
            </Button>

            {hasActiveFilters && (
              <Button size="sm" variant="ghost" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <label className="text-sm font-medium mb-2 block">Channel</label>
                <Select
                  value={filters.channelId || ''}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      channelId: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All channels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All channels</SelectItem>
                    {channels?.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        #{channel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Message Type</label>
                <Select
                  value={filters.messageType || 'all'}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      messageType: value as any,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All messages</SelectItem>
                    <SelectItem value="channel">Channel messages</SelectItem>
                    <SelectItem value="direct">Direct messages</SelectItem>
                    <SelectItem value="threads">Thread messages</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <Separator />

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 py-4">
            {showRecentSearches && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Recent Searches</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((recentQuery, index) => (
                    <Button
                      key={index}
                      size="sm"
                      variant="outline"
                      onClick={() => handleRecentSearchClick(recentQuery)}
                      className="text-xs"
                    >
                      {recentQuery}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {debouncedQuery && isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
                  <span className="text-sm text-muted-foreground">Searching...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="text-center py-8">
                <p className="text-destructive">Error: {error.message}</p>
              </div>
            )}

            {debouncedQuery && !isLoading && !hasResults && !error && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No results found for &quot;{debouncedQuery}&quot;
                </p>
              </div>
            )}

            {searchData?.answer && (
              <AIAnswerCard
                answer={searchData.answer}
                references={searchData.references}
                onReferenceClick={handleNavigate}
              />
            )}

            {hasResults && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {searchData.results.length} results
                    {searchData.executionTime && (
                      <span className="text-muted-foreground ml-2">
                        ({searchData.executionTime}ms)
                      </span>
                    )}
                  </span>
                </div>

                <div className="space-y-3">
                  {searchData.results.map((result) => (
                    <SearchResultCard
                      key={result.messageId}
                      result={result}
                      query={debouncedQuery}
                      onNavigate={handleNavigate}
                      isReferenced={referencedMessageIds.has(result.messageId)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
