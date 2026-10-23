import { useState, type ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ToastProvider } from "@shared/components/feedback";

/**
 * Composition root for global providers. Mount once at the top of main.tsx.
 *
 * Currently wires:
 *   - react-query QueryClient
 *   - Toast notifications (call useToast() anywhere below to surface them)
 *
 * The QueryClient is held in useState so HMR / re-renders don't tear it down
 * and lose every in-flight query.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
