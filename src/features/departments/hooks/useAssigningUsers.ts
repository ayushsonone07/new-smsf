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
  const userRole = (session?.user as any)?.role
  const isDepartmentUser =
    userRole === 'USER' ||
    userRole === 'DEPARTMENT_USER' ||
    Boolean(
      typeof window !== 'undefined' &&
        (window.location.pathname.includes('/user/') ||
          window.location.pathname.includes('-user') ||
          window.location.pathname.includes('/users')),
    )
  const isEnabled = (options?.enabled !== undefined ? options.enabled : true) && !isDepartmentUser

  return useQuery<AssigningUser[]>({
    queryKey: ['assigning-users', departmentType],
    queryFn: () => getAssigningUsers(departmentType),
    enabled: isEnabled,
    staleTime: 30_000,
  })
}
