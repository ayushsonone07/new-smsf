import { useQuery } from '@tanstack/react-query'
import {
  getOnboardingDashboardMembers,
  type OnboardingMembersParams,
  type OnboardingMembersResponse,
} from '../../../api/onboarding-dashboard.api'

export function useOnboardingDashboardMembers(
  params: OnboardingMembersParams = {},
) {
  return useQuery<OnboardingMembersResponse>({
    queryKey: ['onboarding-dashboard-members', params],
    queryFn: () => getOnboardingDashboardMembers(params),
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

