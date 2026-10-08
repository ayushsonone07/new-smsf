import { useEffect, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../queryClient'
import {
  hydrateMockDb,
  MOCK_DB_STORAGE_KEY,
} from '../../api/mock/db'

interface QueryProviderProps {
  children: ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  useEffect(() => {
    function syncMockDb(event: StorageEvent) {
      if (event.key !== MOCK_DB_STORAGE_KEY) return
      if (!hydrateMockDb()) return

      // Admin mutations in another tab changed the module-level mock
      // store. Refetch both the department list and every department's
      // features so Head/User navigation updates immediately.
      void queryClient.invalidateQueries({
        queryKey: ['departments'],
      })
      void queryClient.invalidateQueries({
        queryKey: ['department-features'],
      })
    }

    window.addEventListener('storage', syncMockDb)
    return () => window.removeEventListener('storage', syncMockDb)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
