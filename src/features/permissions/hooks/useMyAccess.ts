import { useQuery } from '@tanstack/react-query'
import {
  getMyColumnPermissions,
  getMyRoutes,
} from '../../../api/my-access.api'

/** Session-scoped reads — backend derives role + department from the JWT. */
export function useMyRoutes() {
  return useQuery({
    queryKey: ['my-access', 'routes'],
    queryFn: getMyRoutes,
  })
}

export function useMyColumnPermissions() {
  return useQuery({
    queryKey: ['my-access', 'columns'],
    queryFn: getMyColumnPermissions,
  })
}
