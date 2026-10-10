import { useQuery } from '@tanstack/react-query'
import { getCustomers } from '../../../api/customers.api'

export const departmentCustomersQueryKey = (
  departmentId: string,
) =>
  ['department-customers', departmentId] as const

export function useDepartmentCustomers(
  departmentId: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey:
      departmentCustomersQueryKey(departmentId),
    queryFn: () =>
      getCustomers(departmentId),
    enabled: (options?.enabled ?? true) && Boolean(departmentId),
  })
}
