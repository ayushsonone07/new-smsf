import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createFeaturePermission,
  deleteFeaturePermission,
  moveFeaturePermission,
} from '../../../api/feature-permissions.api'
import { departmentFeaturesQueryKey } from './useDepartmentFeatures'
import type { CreateFeaturePermissionRequest } from '../types/permission.types'

/** Create / delete / reorder features of one department. */
export function useFeatureMutations(departmentId: string) {
  const queryClient = useQueryClient()

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: departmentFeaturesQueryKey(departmentId),
    })

  const create = useMutation({
    mutationFn: (data: CreateFeaturePermissionRequest) =>
      createFeaturePermission(departmentId, data),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteFeaturePermission(id),
    onSuccess: invalidate,
  })

  const move = useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: 'up' | 'down' }) =>
      moveFeaturePermission(id, direction),
    onSuccess: invalidate,
  })

  return { create, remove, move }
}
