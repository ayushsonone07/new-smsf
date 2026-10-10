import { useQuery } from '@tanstack/react-query'
import {
  getAssigningUsers,
  type AssigningUser,
} from '../../../api/meetings.api'
import { getSession } from '../../../app/auth/session'

export function useAssigningUsers(
  departmentType = 'ONBOARDING_DEPARTMENT',
  options?: { enabled?: boolean },
) {
  const session = getSession()
  const isDepartmentUser = session?.user?.role === 'USER'
  const isEnabled = (options?.enabled !== undefined ? options.enabled : true) && !isDepartmentUser

  return useQuery<AssigningUser[]>({
    queryKey: ['assigning-users', departmentType],
    queryFn: () => getAssigningUsers(departmentType),
    enabled: isEnabled,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

