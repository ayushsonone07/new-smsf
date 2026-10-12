import { useQuery } from '@tanstack/react-query'
import {
  getOnboardingDashboardSummary,
  type OnboardingSummaryParams,
} from '../../../api/onboarding-dashboard.api'

export const onboardingSummaryQueryKey = (
  params: OnboardingSummaryParams,
) =>
  [
    'onboarding-dashboard-summary',
    params,
  ] as const

export function useOnboardingDashboardSummary(
  params: OnboardingSummaryParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: onboardingSummaryQueryKey(params),
    queryFn: () =>
      getOnboardingDashboardSummary(params),
    staleTime: 30_000,
    enabled: options?.enabled,
  })
}
