import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteDepartment } from '../../../api/departments.api'
import { departmentsQueryKey } from './useDepartments'

export function useDeleteDepartment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteDepartment(id),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: departmentsQueryKey }),
        queryClient.invalidateQueries({ queryKey: ['admin-departments-users-count'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-department-summary'] }),
      ])
    },
  })
}
