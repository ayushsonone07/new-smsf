import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateCustomer } from '../../../api/customers.api'
import { departmentCustomersQueryKey } from './useDepartmentCustomers'
import type { UpdateCustomerRequest } from '../types/customer.types'

interface UpdateCustomerVariables {
  id: string
  data: UpdateCustomerRequest
}

export function useUpdateCustomer(
  departmentId: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: UpdateCustomerVariables) =>
      updateCustomer(id, data),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey:
          departmentCustomersQueryKey(departmentId),
      })
    },
  })
}
