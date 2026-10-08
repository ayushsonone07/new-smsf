import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateDepartment } from '../../../api/departments.api'
import { departmentsQueryKey } from './useDepartments'
import type { UpdateDepartmentRequest } from '../types/department.types'

interface UpdateDepartmentVariables {
  id: string
  data: UpdateDepartmentRequest
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: UpdateDepartmentVariables) =>
      updateDepartment(id, data),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: departmentsQueryKey,
      })
    },
  })
}