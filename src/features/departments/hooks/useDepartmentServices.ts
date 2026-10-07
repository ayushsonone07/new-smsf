import { useQuery } from '@tanstack/react-query'
import { getServices } from '../../../api/services.api'

export const departmentServicesQueryKey = (
  departmentId: string,
) =>
  ['department-services', departmentId] as const

export function useDepartmentServices(
  departmentId: string,
) {
  return useQuery({
    queryKey:
      departmentServicesQueryKey(departmentId),
    queryFn: () =>
      getServices(departmentId),
    enabled: Boolean(departmentId),
  })
}
