import { AxiosError } from 'axios';
import { api } from '@/lib/api/axios-client';
import type { SearchResponse, UseSearchOptions } from '@/features/search/types';

export const searchApi = {
  async search(
    workspaceId: string,
    query: string,
    options?: UseSearchOptions,
    requestOptions?: { signal?: AbortSignal },
  ): Promise<SearchResponse> {
    try {
      const response = await api.post(
        `/workspaces/${workspaceId}/search/semantic`,
        {
          query: query.trim(),
          includeThreads: options?.includeThreads,
          limit: options?.limit,
          channelId: options?.channelId,
          conversationId: options?.conversationId,
          ...options,
        },
        {
          signal: requestOptions?.signal, // Axios supports AbortSignal
        },
      );

      return response.data;
    } catch (error) {
      // Handle axios errors
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        throw new Error('Request cancelled');
      }

      if (error instanceof AxiosError) {
        const errorMessage = error.response?.data?.message || error.message || 'Search failed';
        throw new Error(errorMessage);
      }

      throw new Error('Search failed');
    }
  },

  // Helper method to create cancellable search requests
  createCancellableSearch() {
    let currentController: AbortController | null = null;

    return {
      search: async (
        workspaceId: string,
        query: string,
        options?: UseSearchOptions,
      ): Promise<SearchResponse> => {
        // Cancel previous request if still running
        if (currentController) {
          currentController.abort();
        }

        // Create new controller for this request
        currentController = new AbortController();

        try {
          const result = await searchApi.search(workspaceId, query, options, {
            signal: currentController.signal,
          });
          currentController = null; // Clear on success
          return result;
        } catch (error) {
          if (error.name === 'AbortError' || error.message === 'Request cancelled') {
            // Don't clear controller on abort - let the next request handle it
            throw new Error('Request cancelled');
          }
          currentController = null; // Clear on other errors
          throw error;
        }
      },

      cancel: () => {
        if (currentController) {
          currentController.abort();
          currentController = null;
        }
      },
    };
  },
};
