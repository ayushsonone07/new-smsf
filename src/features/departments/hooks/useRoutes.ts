import { useQuery } from '@tanstack/react-query'
import { getRoutes, type RouteInfo } from '../../../api/routes.api'

export const routesQueryKey = ['routes'] as const

export function useRoutes() {
  return useQuery({
    queryKey: routesQueryKey,
    queryFn: async () => {
      console.log('🔍 getRoutes queryFn executing...')
      const result = await getRoutes()
      console.log('🔍 getRoutes result:', result)
      return result
    },
    // Force fresh fetch on window focus / component mount
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  })
}

export type { RouteInfo }