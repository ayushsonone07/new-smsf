import { authedApiRequest } from './client'
import { getSession } from '../app/auth/session'
import type {
  OnboardingDashboardSummary,
} from '../features/departments/types/onboarding-dashboard.types'

/**
 * `GET /api/onboarding/dashboard/summary` — counts for the
 * onboarding dashboard (KPIs, trend, target, status breakdown,
 * most active day, delay split).
 */
export interface OnboardingSummaryParams {
  /** `YYYY-MM-DD`. Both dates are the same day for "Today". */
  startDate?: string
  endDate?: string
  allTime?: boolean
  /** Backend enum, defaults to the session's `departmentType`. */
  department?: string
}

export interface OnboardingMemberPerformance {
  userId: number | string
  name: string
  email: string
  avatarUrl?: string
  phone?: string
  role?: string
  department?: string
  active?: boolean
  allTimeCustomers?: number
  attendance?: string
  presentDays?: number
  absentDays?: number
  assigned?: number
  completed?: number
  delayed?: number
  target?: number
  achievedPercentage?: number
}

export interface OnboardingMembersResponse {
  totalMembers?: number
  teamMembers: OnboardingMemberPerformance[]
  page?: number
  size?: number
  totalPages?: number
}

export interface OnboardingMembersParams {
  department?: string
  page?: number
  size?: number
  startDate?: string
  endDate?: string
  allTime?: boolean
}

interface ApiDataWrapper<T> {
  data?: T
  status?: number
  message?: string
}

/** Fallback when the session carries no `departmentType`. */
export const DEFAULT_DEPARTMENT_TYPE =
  'ONBOARDING_DEPARTMENT'

export function summaryDepartment(): string {
  return (
    getSession()?.user.departmentType ||
    DEFAULT_DEPARTMENT_TYPE
  )
}

export async function getOnboardingDashboardSummary(
  params: OnboardingSummaryParams = {},
): Promise<OnboardingDashboardSummary> {
  const search = new URLSearchParams()

  search.set(
    'department',
    params.department ?? summaryDepartment(),
  )

  if (params.startDate) {
    search.set('startDate', params.startDate)
  }

  if (params.endDate) {
    search.set('endDate', params.endDate)
  }

  if (params.allTime) {
    search.set('allTime', 'true')
  }

  const res = await authedApiRequest<
    ApiDataWrapper<OnboardingDashboardSummary> & OnboardingDashboardSummary
  >(`/api/onboarding/dashboard/summary?${search.toString()}`)

  return (res?.data ?? res) as OnboardingDashboardSummary
}

/**
 * `GET /api/onboarding/dashboard/members`
 */
export async function getOnboardingDashboardMembers(
  params: OnboardingMembersParams = {},
): Promise<OnboardingMembersResponse> {
  const search = new URLSearchParams()

  search.set(
    'department',
    params.department ?? summaryDepartment(),
  )

  if (params.page !== undefined) search.set('page', String(params.page))
  if (params.size !== undefined) search.set('size', String(params.size))
  if (params.startDate) search.set('startDate', params.startDate)
  if (params.endDate) search.set('endDate', params.endDate)
  if (params.allTime) search.set('allTime', 'true')

  const res = await authedApiRequest<
    ApiDataWrapper<OnboardingMembersResponse> & OnboardingMembersResponse
  >(`/api/onboarding/dashboard/members?${search.toString()}`)

  const payload = (res?.data ?? res) as OnboardingMembersResponse
  return {
    totalMembers: payload?.totalMembers ?? payload?.teamMembers?.length ?? 0,
    teamMembers: Array.isArray(payload?.teamMembers) ? payload.teamMembers : [],
    page: payload?.page ?? 0,
    size: payload?.size ?? 10,
    totalPages: payload?.totalPages ?? 1,
  }
}
