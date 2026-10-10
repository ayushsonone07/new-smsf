import { useQuery } from '@tanstack/react-query'
import {
  getMemberDetails,
  type MemberDetailsParams,
  type OnboardingMemberDetailsDTO,
} from '../../../api/onboarding-dashboard.api'

export const memberDetailsQueryKey = (params: MemberDetailsParams) =>
  ['member-details', params] as const

export function useMemberDetails(params: MemberDetailsParams) {
  const userId = typeof params.userId === 'string' ? Number(params.userId) : params.userId
  return useQuery<OnboardingMemberDetailsDTO>({
    queryKey: memberDetailsQueryKey(params),
    queryFn: () => getMemberDetails(params),
    enabled: userId != null && userId > 0,
    staleTime: 30_000,
  })
}