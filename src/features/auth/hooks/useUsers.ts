import { useQuery } from '@tanstack/react-query'
import { getUsers } from '../../../api/auth.api'

export const usersQueryKey = ['users'] as const

export function useUsers() {
  return useQuery({
    queryKey: usersQueryKey,
    queryFn: getUsers,
  })
}
