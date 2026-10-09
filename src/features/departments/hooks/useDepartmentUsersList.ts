import { useQuery } from '@tanstack/react-query'
import {
  getDepartmentUsers,
  getOnboardingCustomers,
  getAuthOnboardingSummary,
  type DepartmentUsersPageResponse,
  type OnboardedCustomersPageResponse,
  type AuthOnboardingSummary,
} from '../../../api/department-users.api'

export function useDepartmentUsersList(params: {
  page?: number
  size?: number
  search?: string
} = {}) {
  return useQuery<DepartmentUsersPageResponse>({
    queryKey: ['department-users-list', params],
    queryFn: () => getDepartmentUsers(params),
    staleTime: 30_000,
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

export function useAuthOnboardingSummary(params: {
  startDate?: string
  endDate?: string
  department?: string
  allTime?: boolean
} = {}) {
  return useQuery<AuthOnboardingSummary>({
    queryKey: ['auth-onboarding-summary', params],
    queryFn: () => getAuthOnboardingSummary(params),
    staleTime: 30_000,
  })
}

