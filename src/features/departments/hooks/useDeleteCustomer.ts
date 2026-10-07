import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteCustomer } from '../../../api/customers.api'
import { departmentCustomersQueryKey } from './useDepartmentCustomers'

export function useDeleteCustomer(
  departmentId: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteCustomer(id),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey:
          departmentCustomersQueryKey(departmentId),
      })
    },
  })
}
