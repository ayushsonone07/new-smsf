import { useQuery } from '@tanstack/react-query'
import { getDepartmentDashboard } from '../../../api/department-dashboard.api'

export const departmentDashboardQueryKey = (
  departmentId: string,
) =>
  ['department-dashboard', departmentId] as const

export function useDepartmentDashboard(
  departmentId: string,
) {
  return useQuery({
    queryKey:
      departmentDashboardQueryKey(departmentId),
    queryFn: () =>
      getDepartmentDashboard(departmentId),
    enabled: Boolean(departmentId),
  })
}
