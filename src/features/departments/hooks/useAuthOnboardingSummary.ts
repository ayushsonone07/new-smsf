import { useQuery } from '@tanstack/react-query'
import {
  getAuthOnboardingSummary,
  type AuthOnboardingSummaryParams,
  type AuthOnboardingSummary,
} from '../../../api/onboarding-dashboard.api'

export const authOnboardingSummaryQueryKey = (
  params: AuthOnboardingSummaryParams,
) =>
  ['auth-onboarding-summary', params] as const

export function useAuthOnboardingSummary(
  params: AuthOnboardingSummaryParams = {},
  options?: { enabled?: boolean },
) {
  return useQuery<AuthOnboardingSummary>({
    queryKey: authOnboardingSummaryQueryKey(params),
    queryFn: () => getAuthOnboardingSummary(params),
    staleTime: 30_000,
    enabled: options?.enabled,
  })
}