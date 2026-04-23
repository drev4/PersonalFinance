import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,    // 5 minutes by default
      gcTime: 1000 * 60 * 10,       // garbage collect after 10 minutes of inactivity
      retry: (failureCount, error) => {
        // Never retry on 4xx client errors
        if (error instanceof Error && /\b4\d{2}\b/.test(error.message)) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,  // do not refetch when window regains focus
    },
    mutations: {
      retry: 0,
    },
  },
});
