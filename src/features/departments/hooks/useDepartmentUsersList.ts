import { useQuery, useInfiniteQuery, type InfiniteData } from '@tanstack/react-query'
import {
  getDepartmentUsers,
  getOnboardingCustomers,
  getDepartmentCustomerRows,
  type DepartmentUsersPageResponse,
  type OnboardedCustomersPageResponse,
  type DepartmentCustomerRowsPageResponse,
} from '../../../api/department-users.api'
import {
  getAuthOnboardingSummary,
  type AuthOnboardingSummary,
  type AuthOnboardingSummaryParams,
} from '../../../api/onboarding-dashboard.api'

export function useDepartmentUsersList(params: {
  page?: number
  size?: number
  search?: string
} = {}) {
  return useQuery<DepartmentUsersPageResponse>({
    queryKey: ['department-users-list', params],
    queryFn: () => getDepartmentUsers(params),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  })
}

export function useInfiniteDepartmentUsersList(params: {
  size?: number
  search?: string
} = {}) {
  return useInfiniteQuery<
    DepartmentUsersPageResponse,
    Error,
    InfiniteData<DepartmentUsersPageResponse>,
    [string, { size?: number; search?: string }],
    number
  >({
    queryKey: ['department-users-infinite', params],
    queryFn: async ({ pageParam = 0 }) => {
      return getDepartmentUsers({
        ...params,
        page: pageParam as number,
        size: params.size ?? 10,
      })
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const size = params.size ?? 10
      const currentItemsCount = lastPage.data?.length ?? 0
      if (currentItemsCount < size) {
        return undefined
      }

      const totalItemsSoFar = allPages.reduce(
        (sum, p) => sum + (p.data?.length ?? 0),
        0,
      )

      if (lastPage.totalElements !== undefined && totalItemsSoFar >= lastPage.totalElements) {
        return undefined
      }

      const currentPage = lastPage.pageNumber ?? (allPages.length - 1)
      const totalPages = lastPage.totalPage

      if (totalPages !== undefined && currentPage + 1 >= totalPages) {
        return undefined
      }

      return currentPage + 1
    },
    staleTime: 30_000,
  })
}

export function useOnboardingCustomersList(
  params: {
    page?: number
    size?: number
    searchParam?: string
    startDate?: string
    endDate?: string
    status?: string
    filteredUser?: string
  } = {},
  options?: { enabled?: boolean },
) {
  return useQuery<OnboardedCustomersPageResponse>({
    queryKey: ['onboarding-customers-list', params],
    queryFn: () => getOnboardingCustomers(params),
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
  })
}

export function useAuthOnboardingSummary(
  params: AuthOnboardingSummaryParams = {},
  options?: { enabled?: boolean },
) {
  return useQuery<AuthOnboardingSummary>({
    queryKey: ['auth-onboarding-summary', params],
    queryFn: () => getAuthOnboardingSummary(params),
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
  })
}

export function useDepartmentCustomerRows(
  params: {
    page?: number
    size?: number
    searchParam?: string
    statusFilter?: string
    userFilter?: string
    startDate?: string
    endDate?: string
    compatible?: boolean
  } = {},
  options?: { enabled?: boolean },
) {
  return useQuery<DepartmentCustomerRowsPageResponse>({
    queryKey: ['department-customer-rows', params],
    queryFn: () => getDepartmentCustomerRows(params),
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
  })
}

