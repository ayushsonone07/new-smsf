import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createCustomer } from '../../../api/customers.api'
import { departmentCustomersQueryKey } from './useDepartmentCustomers'
import type { CreateCustomerRequest } from '../types/customer.types'

interface CreateCustomerVariables {
  departmentId: string
  data: CreateCustomerRequest
}

export function useCreateCustomer(
  departmentId: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      departmentId,
      data,
    }: CreateCustomerVariables) =>
      createCustomer(departmentId, data),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey:
          departmentCustomersQueryKey(departmentId),
      })
    },
  })
}
