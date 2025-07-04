import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { searchApi } from '@/features/search/api/search-api';
import type { SearchResponse, UseSearchOptions } from '@/features/search/types';

export function useSearch(
  workspaceId: string,
  query: string,
  options?: UseSearchOptions,
  queryOptions?: UseQueryOptions<SearchResponse, Error, SearchResponse>,
) {
  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (query?.trim() && workspaceId && query.length >= 2) {
      queryClient.cancelQueries({
        queryKey: ['search', workspaceId],
        exact: false,
      });
    }
  }, [query, workspaceId, queryClient]);

  return useQuery<SearchResponse, Error>({
    queryKey: ['search', workspaceId, query, options],
    queryFn: async ({ signal }) => {
      abortControllerRef.current = new AbortController();

      try {
        const result = await searchApi.search(workspaceId, query, options, {
          signal: signal || abortControllerRef.current.signal,
        });
        return result;
      } catch (error) {
        if (error.name === 'AbortError') {
          throw new Error('Request cancelled');
        }
        throw error;
      }
    },
    enabled: Boolean(query?.trim() && workspaceId && query.length >= 2),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.message === 'Request cancelled') return false;
      if (error.message?.includes('429')) return failureCount < 2;
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    ...queryOptions,
  });
}

export function useSearchSuggestions(
  workspaceId: string,
  query: string,
  options?: UseSearchOptions,
) {
  return useQuery<SearchResponse, Error>({
    queryKey: ['search-suggestions', workspaceId, query, options],
    queryFn: ({ signal }) =>
      searchApi.search(workspaceId, query, { ...options, limit: 5 }, { signal }),
    enabled: Boolean(query?.trim() && workspaceId && query.length >= 1),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
