'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours (matches maxAge for proper persistence)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx client errors (except 401 which might be token related)
        if (error?.response?.status) {
          const status = error.response.status;
          if (status >= 400 && status < 500 && status !== 401) {
            return false;
          }
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false, // Disable aggressive refetching
    },
    mutations: {
      retry: false, // Don't retry mutations by default
    },
  },
});

// Create async persister for localStorage with optimized configuration
const persister = createAsyncStoragePersister({
  storage: {
    getItem: (key: string) => {
      if (typeof window === 'undefined') return Promise.resolve(null);
      return Promise.resolve(window.localStorage.getItem(key));
    },
    setItem: (key: string, value: string) => {
      if (typeof window === 'undefined') return Promise.resolve();
      window.localStorage.setItem(key, value);
      return Promise.resolve();
    },
    removeItem: (key: string) => {
      if (typeof window === 'undefined') return Promise.resolve();
      window.localStorage.removeItem(key);
      return Promise.resolve();
    },
  },
  throttleTime: 1000, // Throttle persistence writes to every 1 second for better performance
});

export default function ReactQueryProvider({ children }: { children: ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
        buster: 'v1', // Increment to invalidate all cached data
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            // Only persist specific queries that benefit from caching
            const persistKeys = [
              'workspaces',
              'workspace',
              'channels',
              'user-channels',
              'conversations',
              'agents',
              'currentUser',
            ];
            
            // Don't persist queries with errors or that are currently errored
            if (query.state.status === 'error') {
              return false;
            }
            
            return persistKeys.some(key => 
              Array.isArray(query.queryKey) && 
              query.queryKey.includes(key)
            );
          },
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
