import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateOnboardingStatus } from '../../../api/department-users.api'

interface UpdateOnboardingCustomerStatusVariables {
  customerId: string
  status: string
  onboardingLink?: string
}

export function useUpdateOnboardingCustomerStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variables: UpdateOnboardingCustomerStatusVariables) =>
      updateOnboardingStatus(variables.customerId, variables.status),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['onboarding-customers-list'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['auth-onboarding-summary'],
        }),
      ])
    },
  })
}
