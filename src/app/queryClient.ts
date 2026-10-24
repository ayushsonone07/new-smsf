import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // Keep data fresh for 1 min to prevent continuous re-fetching
      gcTime: 5 * 60_000, // Cache in memory for 5 mins
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})