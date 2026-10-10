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

/**
 * `GET /api/auth/onboarding/summary` — onboarding summary from auth service
 * with date-time support (e.g., 2026-10-10T00:00:00, 2026-10-10T23:59:59)
 */
export interface AuthOnboardingSummaryParams {
  startDate?: string
  endDate?: string
  selectedUserIds?: number[]
  department?: string
  allTime?: boolean
}

export interface AuthOnboardingSummary {
  summary?: {
    total?: number
    pending?: number
    inProgress?: number
    completed?: number
  }

  // Backend field names (from OnboardingSummaryDTO)
  totalCustomers?: number
  totalOnboardedCustomers?: number
  totalPendingOnboarding?: number
  totalInProgressOnboarding?: number
  totalCompletedOnboarding?: number
  totalOnboardingTimeExceedingCustomers?: number
  presentUsers?: number
  absentUsers?: number
  trend?: OnboardingTrendDTO
  teamTarget?: OnboardingTargetAchievementDTO
  teamMembers?: OnboardingMemberPerformanceDTO[]
  delayBreakdown?: OnboardingDelayBreakdownDTO
  
  // Alternative field names (in case backend uses different JSON property names)
  total?: number
  pending?: number
  inProgress?: number
  completed?: number
  onboarded?: number
}

export interface OnboardingDelayBreakdownDTO {
  clientSide?: { count: number; percentage: number }
  ourSide?: { count: number; percentage: number }
  techOtherDepartment?: { count: number; percentage: number }
  available?: boolean
}

export interface OnboardingTrendDTO {
  interval?: string
  labels: string[]
  newCustomers: number[]
  previousPeriod: number[]
}

export interface OnboardingTargetAchievementDTO {
  target: number
  achieved: number
  remaining: number
  percentage: number
}

export interface OnboardingMemberPerformanceDTO {
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
  teamMembers: OnboardingMemberPerformanceDTO[]
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

/**
 * `GET /api/auth/onboarding/summary`
 * Onboarding summary from auth service with date-time support.
 * Uses ISO datetime format: 2026-10-10T00:00:00, 2026-10-10T23:59:59
 */
export async function getAuthOnboardingSummary(
  params: AuthOnboardingSummaryParams = {},
): Promise<AuthOnboardingSummary> {
  const search = new URLSearchParams()

  search.set('department', params.department ?? summaryDepartment())

  if (params.startDate) search.set('startDate', params.startDate)
  if (params.endDate) search.set('endDate', params.endDate)
  if (params.allTime) search.set('allTime', 'true')
  if (params.selectedUserIds?.length) {
    params.selectedUserIds.forEach(id => search.append('selectedUserIds', String(id)))
  }

  const res = await authedApiRequest<
    { data?: AuthOnboardingSummary } & AuthOnboardingSummary
  >(`/api/auth/onboarding/summary?${search.toString()}`)

  return (res?.data ?? res) as AuthOnboardingSummary
}
