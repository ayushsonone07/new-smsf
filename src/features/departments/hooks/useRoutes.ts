import { useQuery } from '@tanstack/react-query'
import { getRoutes, type RouteInfo } from '../../../api/routes.api'

export const routesQueryKey = ['routes'] as const

export function useRoutes() {
  console.log('🔍 useRoutes hook called')
  const query = useQuery({
    queryKey: routesQueryKey,
    queryFn: async () => {
      console.log('🔍 getRoutes queryFn executing...')
      const result = await getRoutes()
      console.log('🔍 getRoutes result:', result)
      return result
    },
  })
  console.log('🔍 useRoutes query state:', { isPending: query.isPending, isError: query.isError, data: query.data })
  return query
}

export type { RouteInfo }