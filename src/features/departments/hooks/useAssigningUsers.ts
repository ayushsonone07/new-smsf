import { useQuery } from '@tanstack/react-query'
import {
  getAssigningUsers,
  type AssigningUser,
} from '../../../api/meetings.api'

export function useAssigningUsers(
  departmentType = 'ONBOARDING_DEPARTMENT',
) {
  return useQuery<AssigningUser[]>({
    queryKey: ['assigning-users', departmentType],
    queryFn: () => getAssigningUsers(departmentType),
    staleTime: 60_000,
  })
}

