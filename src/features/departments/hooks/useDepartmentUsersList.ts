import { useQuery } from '@tanstack/react-query'
import {
  getDepartmentUsers,
  getOnboardingCustomers,
  type DepartmentUsersPageResponse,
  type OnboardedCustomersPageResponse,
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

