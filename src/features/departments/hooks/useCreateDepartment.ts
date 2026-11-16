import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createDepartment } from '../../../api/departments.api'
import { departmentsQueryKey } from './useDepartments'
import type { CreateDepartmentRequest } from '../types/department.types'

export function useCreateDepartment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateDepartmentRequest) =>
      createDepartment(data),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: departmentsQueryKey,
        }),
        queryClient.invalidateQueries({ queryKey: ['admin-department-heads'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-departments-users-count'] }),
        queryClient.invalidateQueries({
          queryKey: ['dynamic-permissions'],
        }),
      ])
    },
  })
}
