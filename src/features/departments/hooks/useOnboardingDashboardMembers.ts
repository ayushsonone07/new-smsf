import { useQuery, useInfiniteQuery, type InfiniteData } from '@tanstack/react-query'
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
    staleTime: 30_000,
    refetchOnMount: 'always',
  })
}

export function useInfiniteOnboardingDashboardMembers(
  params: Omit<OnboardingMembersParams, 'page'> = {},
) {
  return useInfiniteQuery<
    OnboardingMembersResponse,
    Error,
    InfiniteData<OnboardingMembersResponse>,
    [string, Omit<OnboardingMembersParams, 'page'>],
    number
  >({
    queryKey: ['onboarding-dashboard-members-infinite', params],
    queryFn: async ({ pageParam = 0 }) => {
      return getOnboardingDashboardMembers({
        ...params,
        page: pageParam as number,
        size: params.size ?? 10,
      })
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const size = params.size ?? 10
      const currentItemsCount = lastPage.teamMembers?.length ?? 0
      // If the last page returned fewer items than the requested size, there are no more pages
      if (currentItemsCount < size) {
        return undefined
      }

      const totalItemsSoFar = allPages.reduce(
        (sum, p) => sum + (p.teamMembers?.length ?? 0),
        0,
      )

      if (lastPage.totalMembers !== undefined && totalItemsSoFar >= lastPage.totalMembers) {
        return undefined
      }

      const currentPage = lastPage.page ?? (allPages.length - 1)
      const totalPages = lastPage.totalPages

      if (totalPages !== undefined && currentPage + 1 >= totalPages) {
        return undefined
      }

      return currentPage + 1
    },
    staleTime: 30_000,
  })
}

