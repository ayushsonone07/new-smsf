import { authedApiRequest } from './client'
import { getSession } from '../app/auth/session'
import type {
  OnboardingDashboardSummary,
} from '../features/departments/types/onboarding-dashboard.types'

/**
 * `GET /api/dashboard/summary` — counts for the
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
  pendingCustomers?: number
  inProgressCustomers?: number
  onboardedCustomers?: number
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
  completed?: number[]
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
  pending?: number
  inProgress?: number
  cancelled?: number
  churned?: number
  followUp?: number
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
  status?: number | string
  message?: string
  success?: boolean
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
    completed: Array.isArray(dto.trend.completed) ? dto.trend.completed : [],
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
  >(`/api/dashboard/summary?${search.toString()}`)

  if (res && 'data' in res && res.data === null) {
    return normalizeAuthSummaryToDashboardSummary({}, {
      startDate: params.startDate,
      endDate: params.endDate,
      allTime: params.allTime,
    })
  }

  return (res?.data ?? res) as OnboardingDashboardSummary
}

/**
 * `GET /api/auth/department/members/performance`
 */
export async function getOnboardingDashboardMembers(
  params: OnboardingMembersParams = {},
): Promise<OnboardingMembersResponse> {
  const search = new URLSearchParams()

  search.set('departmentType', params.department ?? summaryDepartment())

  if (params.page !== undefined) search.set('page', String(params.page))
  if (params.size !== undefined) search.set('size', String(params.size))
  const res = await authedApiRequest<any>(
    `/api/auth/department/members/performance?${search.toString()}`,
  )

  const payload = res?.data ?? res
  const performancePayload = payload?.data ?? payload
  const rows = Array.isArray(performancePayload?.data)
    ? performancePayload.data
    : []

  const rawMembers: OnboardingMemberPerformanceDTO[] = rows.map(
    (row: Record<string, unknown>) => {
      const totalCustomers = Number(row.totalCustomers ?? 0)
      const completed = Number(row.completedCustomers ?? 0)
      const cancelled = Number(row.cancelledCustomers ?? 0)
      const churned = Number(row.churnedCustomers ?? 0)

      return {
        userId: String(row.email ?? row.username ?? ''),
        name: String(row.username ?? row.email ?? 'Unknown user'),
        email: String(row.email ?? ''),
        allTimeCustomers: totalCustomers,
        assigned: totalCustomers,
        completed,
        delayed: cancelled + churned,
        pending: Number(row.pendingCustomers ?? 0),
        inProgress: Number(row.inProgressCustomers ?? 0),
        cancelled,
        churned,
        followUp: Number(row.followUp ?? 0),
        achievedPercentage:
          totalCustomers > 0 ? (completed / totalCustomers) * 100 : 0,
      }
    },
  )

  const totalMembers =
    performancePayload?.totalElements ??
    performancePayload?.total

  const page = performancePayload?.page ?? performancePayload?.pageNumber ?? (params.page ?? 0)
  const size = performancePayload?.size ?? performancePayload?.pageSize ?? (params.size ?? 10)

  const totalPages =
    performancePayload?.totalPages ??
    performancePayload?.totalPage

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
    { data?: AuthOnboardingSummary | null } & AuthOnboardingSummary
  >(`/api/auth/onboarding/summary?${search.toString()}`)

  if (res && 'data' in res && res.data === null) {
    return null as unknown as AuthOnboardingSummary
  }

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
  >(`/api/onboarding/dashboard/member/${encodeURIComponent(String(userId))}?${search.toString()}`)

  const payload = (res?.data ?? res) as unknown as Omit<
    OnboardingMemberDetailsDTO,
    'customers'
  > & {
    customers?:
      | OnboardingDashboardCustomerDTO[]
      | {
          content?: OnboardingDashboardCustomerDTO[]
          data?: OnboardingDashboardCustomerDTO[]
          customers?: OnboardingDashboardCustomerDTO[]
          totalElements?: number
          totalPages?: number
        }
  }
  const customerPage = payload.customers
  const customers = Array.isArray(customerPage)
    ? customerPage
    : customerPage?.content ?? customerPage?.data ?? customerPage?.customers ?? []

  return {
    ...payload,
    customers,
    totalCustomers:
      payload.totalCustomers ??
      (!Array.isArray(customerPage) ? customerPage?.totalElements : undefined) ??
      customers.length,
    totalPages:
      payload.totalPages ??
      (!Array.isArray(customerPage) ? customerPage?.totalPages : undefined),
  }
}
