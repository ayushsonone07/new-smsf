import { useQuery } from '@tanstack/react-query'
import { getFeaturePermissions } from '../../../api/feature-permissions.api'

export const departmentFeaturesQueryKey = (
  departmentId: string,
) =>
  [
    'department-features',
    departmentId,
  ] as const

export function useDepartmentFeatures(
  departmentId: string,
) {
  return useQuery({
    queryKey:
      departmentFeaturesQueryKey(departmentId),
    queryFn: () =>
      getFeaturePermissions(departmentId),
    enabled: Boolean(departmentId),
  })
}
