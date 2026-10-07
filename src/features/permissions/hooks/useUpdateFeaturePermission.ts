import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { updateFeaturePermission } from '../../../api/feature-permissions.api'
import { departmentFeaturesQueryKey } from './useDepartmentFeatures'
import type { UpdateFeaturePermissionRequest } from '../types/permission.types'

interface UpdateFeaturePermissionVariables {
  id: string
  data: UpdateFeaturePermissionRequest
}

export function useUpdateFeaturePermission(
  departmentId: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: UpdateFeaturePermissionVariables) =>
      updateFeaturePermission(id, data),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey:
          departmentFeaturesQueryKey(departmentId),
      })
    },
  })
}
