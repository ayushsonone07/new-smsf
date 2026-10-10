import { useQuery } from '@tanstack/react-query'
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

export function useOnboardingCustomersList(params: {
  page?: number
  size?: number
  searchParam?: string
  startDate?: string
  endDate?: string
  completionStartDate?: string
  completionEndDate?: string
  status?: string
  filteredUser?: string
} = {}) {
  return useQuery<OnboardedCustomersPageResponse>({
    queryKey: ['onboarding-customers-list', params],
    queryFn: () => getOnboardingCustomers(params),
    staleTime: 30_000,
  })
}

export function useAuthOnboardingSummary(params: AuthOnboardingSummaryParams = {}) {
  return useQuery<AuthOnboardingSummary>({
    queryKey: ['auth-onboarding-summary', params],
    queryFn: () => getAuthOnboardingSummary(params),
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
