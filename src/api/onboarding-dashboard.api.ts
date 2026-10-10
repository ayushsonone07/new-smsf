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

function formatIsoDateTime(dateStr?: string, isEnd = false): string | undefined {
  if (!dateStr) return undefined
  if (dateStr.includes('T')) return dateStr
  return isEnd ? `${dateStr}T23:59:59` : `${dateStr}T00:00:00`
}

export function normalizeAuthSummaryToDashboardSummary(
  dto: AuthOnboardingSummary,
  periodInfo?: { startDate?: string; endDate?: string; allTime?: boolean },
): OnboardingDashboardSummary {
  const total = Number(dto.totalCustomers ?? dto.total ?? 0)
  const completed = Number(dto.totalCompletedOnboarding ?? dto.completed ?? 0)
  const pending = Number(dto.totalPendingOnboarding ?? dto.pending ?? 0)
  const inProgress = Number(dto.totalInProgressOnboarding ?? dto.inProgress ?? 0)
  const delayed = Number(dto.totalOnboardingTimeExceedingCustomers ?? 0)
  const onboarded = Number(dto.totalOnboardedCustomers ?? dto.onboarded ?? (completed + inProgress))

  const calcPct = (cnt: number) => (total > 0 ? Math.round((cnt / total) * 100) : 0)

  const member0 = dto.teamMembers?.[0]
  const present = Number(dto.presentUsers ?? member0?.presentDays ?? 0)
  const absent = Number(dto.absentUsers ?? member0?.absentDays ?? 0)

  const rawTarget = dto.teamTarget as unknown as Record<string, unknown> | undefined
  const targetAchievement = rawTarget ? {
    target: Number(rawTarget.target ?? 0),
    achieved: Number(rawTarget.achieved ?? 0),
    remaining: Number(rawTarget.remaining ?? 0),
    percentage: Number(rawTarget.percentage ?? rawTarget.achievementPercentage ?? 0),
  } : undefined

  const trendData = dto.trend ? {
    interval: dto.trend.interval,
    labels: Array.isArray(dto.trend.labels) ? dto.trend.labels : [],
    newCustomers: Array.isArray(dto.trend.newCustomers) ? dto.trend.newCustomers : [],
    completed: [],
    previousPeriod: Array.isArray(dto.trend.previousPeriod) ? dto.trend.previousPeriod : [],
  } : undefined

  return {
    kpis: {
      totalCustomers: total,
      totalOnboarded: onboarded,
      totalCompleted: completed,
      totalInProgress: inProgress,
      totalPending: pending,
      totalDelayed: delayed,
      presentUsers: present,
      absentUsers: absent,
    },
    teamTarget: targetAchievement,
    trend: trendData,
    statusBreakdown: {
      pending: { count: pending, percentage: calcPct(pending) },
      inProgress: { count: inProgress, percentage: calcPct(inProgress) },
      completed: { count: completed, percentage: calcPct(completed) },
      delayed: { count: delayed, percentage: calcPct(delayed) },
    },
    delayBreakdown: dto.delayBreakdown,
    totalDelayed: delayed,
    period: periodInfo ? {
      startDate: periodInfo.startDate,
      endDate: periodInfo.endDate,
      label: periodInfo.allTime ? 'All time' : periodInfo.startDate === periodInfo.endDate ? 'Today' : 'Custom range',
    } : undefined,
  }
}

export async function getOnboardingDashboardSummary(
  params: OnboardingSummaryParams = {},
): Promise<OnboardingDashboardSummary> {
  const dept = params.department ?? summaryDepartment()

  // 1. Primary: fetch from /api/auth/onboarding/summary
  try {
    const authData = await getAuthOnboardingSummary({
      department: dept,
      startDate: params.startDate,
      endDate: params.endDate,
      allTime: params.allTime,
    })

    if (
      authData &&
      (authData.totalCustomers !== undefined ||
        authData.total !== undefined ||
        authData.teamTarget !== undefined)
    ) {
      return normalizeAuthSummaryToDashboardSummary(authData, {
        startDate: params.startDate,
        endDate: params.endDate,
        allTime: params.allTime,
      })
    }
  } catch (err) {
    console.warn('Could not fetch from /api/auth/onboarding/summary, falling back:', err)
  }

  // 2. Fallback: /api/onboarding/dashboard/summary
  const search = new URLSearchParams()

  search.set(
    'department',
    dept,
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

  const res = await authedApiRequest<any>(
    `/api/onboarding/dashboard/members?${search.toString()}`,
  )

  const payload = (res?.data ?? res) as any

  const rawMembers: OnboardingMemberPerformanceDTO[] = Array.isArray(payload?.teamMembers)
    ? payload.teamMembers
    : Array.isArray(payload?.members)
      ? payload.members
      : Array.isArray(payload?.content)
        ? payload.content
        : Array.isArray(res?.teamMembers)
          ? res.teamMembers
          : Array.isArray(res?.data?.teamMembers)
            ? res.data.teamMembers
            : Array.isArray(res?.data?.content)
              ? res.data.content
              : Array.isArray(payload)
                ? payload
                : []

  const totalMembers =
    payload?.totalMembers ??
    payload?.totalElements ??
    payload?.total ??
    res?.totalMembers ??
    res?.totalElements ??
    res?.total ??
    rawMembers.length

  const page = payload?.page ?? payload?.pageNumber ?? res?.page ?? (params.page ?? 0)
  const size = payload?.size ?? payload?.pageSize ?? res?.size ?? (params.size ?? 10)

  const totalPages =
    payload?.totalPages ??
    payload?.totalPage ??
    res?.totalPages ??
    res?.totalPage ??
    Math.max(1, Math.ceil(totalMembers / size))

  return {
    totalMembers,
    teamMembers: rawMembers,
    page,
    size,
    totalPages,
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

  const startIso = formatIsoDateTime(params.startDate, false)
  const endIso = formatIsoDateTime(params.endDate, true)

  if (startIso) search.set('startDate', startIso)
  if (endIso) search.set('endDate', endIso)
  if (params.allTime) search.set('allTime', 'true')
  if (params.selectedUserIds?.length) {
    params.selectedUserIds.forEach(id => search.append('selectedUserIds', String(id)))
  }

  const res = await authedApiRequest<
    { data?: AuthOnboardingSummary } & AuthOnboardingSummary
  >(`/api/auth/onboarding/summary?${search.toString()}`)

  return (res?.data ?? res) as AuthOnboardingSummary
}

/**
 * `GET /api/onboarding/dashboard/member/{userId}`
 * Get detailed member report with customers list and statistics.
 */
export interface MemberDetailsParams {
  userId: number | string
  department?: string
  startDate?: string
  endDate?: string
  page?: number
  size?: number
}

export interface OnboardingMemberInfoDTO {
  userId: number | string
  name: string
  email: string
  avatar?: string
}

export interface OnboardingDelaySideCountsDTO {
  clientSide?: number
  ourSide?: number
  techSide?: number
}

export interface OnboardingMemberPerformanceDTO {
  userId: number | string
  name: string
  email: string
  avatar?: string
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
  delaySideCounts?: OnboardingDelaySideCountsDTO
}

export interface OnboardingDashboardCustomerDTO {
  customerId?: number | string
  customerName?: string
  ownerName?: string
  email?: string
  phone?: string
  city?: string
  status?: string
  isDelayed?: boolean
  delayDays?: number
  delaySide?: string
  delayReason?: string
  remark?: string
  assignedMemberId?: number | string
  assignedMember?: string
  createdAt?: string
  updatedAt?: string
}

export interface OnboardingMemberDetailsDTO {
  member?: OnboardingMemberInfoDTO
  statistics?: OnboardingMemberPerformanceDTO
  customers?: OnboardingDashboardCustomerDTO[]
  totalCustomers?: number
  page?: number
  size?: number
  totalPages?: number
  first?: boolean
  last?: boolean
}

export async function getMemberDetails(
  params: MemberDetailsParams,
): Promise<OnboardingMemberDetailsDTO> {
  const { userId, ...queryParams } = params
  const search = new URLSearchParams()

  search.set('department', queryParams.department ?? summaryDepartment())

  if (queryParams.startDate) search.set('startDate', queryParams.startDate)
  if (queryParams.endDate) search.set('endDate', queryParams.endDate)
  if (queryParams.page !== undefined) search.set('page', String(queryParams.page))
  if (queryParams.size !== undefined) search.set('size', String(queryParams.size))

  const res = await authedApiRequest<
    { data?: OnboardingMemberDetailsDTO } & OnboardingMemberDetailsDTO
  >(`/api/onboarding/dashboard/member/${userId}?${search.toString()}`)

  return (res?.data ?? res) as OnboardingMemberDetailsDTO
}
