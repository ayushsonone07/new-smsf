import { useQuery } from '@tanstack/react-query'
import {
  getMemberDetails,
  type MemberDetailsParams,
  type OnboardingMemberDetailsDTO,
} from '../../../api/onboarding-dashboard.api'

export const memberDetailsQueryKey = (params: MemberDetailsParams) =>
  ['member-details', params] as const

export function useMemberDetails(params: MemberDetailsParams) {
  const userId = String(params.userId ?? '').trim()
  return useQuery<OnboardingMemberDetailsDTO>({
    queryKey: memberDetailsQueryKey(params),
    queryFn: () => getMemberDetails(params),
    enabled: userId !== '' && userId !== '0',
    staleTime: 30_000,
  })
}
