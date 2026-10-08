import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteDepartment } from '../../../api/departments.api'
import { departmentsQueryKey } from './useDepartments'

export function useDeleteDepartment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteDepartment(id),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: departmentsQueryKey,
      })
    },
  })
}