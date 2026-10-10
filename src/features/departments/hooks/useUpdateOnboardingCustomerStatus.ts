import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateOnboardingCustomerStatus } from '../../../api/department-users.api'
import type { OnboardingStatusUpdate } from '../../../api/department-users.api'

interface UpdateOnboardingCustomerStatusVariables {
  customerId: string
  status: OnboardingStatusUpdate
  onboardingLink?: string
}

export function useUpdateOnboardingCustomerStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variables: UpdateOnboardingCustomerStatusVariables) =>
      updateOnboardingCustomerStatus(variables),
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
