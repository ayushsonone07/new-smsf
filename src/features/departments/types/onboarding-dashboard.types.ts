/**
 * Response of the backend onboarding dashboard endpoints
 * (`GET /api/onboarding/dashboard/summary`, `.../dashboard`) —
 * `OnboardingDashboardResponseDTO` of SMSB mirrored for the UI.
 *
 * All counts are scoped by the requester: a department USER
 * gets their own numbers, a department head the whole team.
 */
export interface OnboardingSummaryDepartment {
  id?: string
  name?: string
}

export interface OnboardingSummaryPeriod {
  startDate?: string
  endDate?: string
  label?: string
  caption?: string
}

export interface OnboardingSummaryKpis {
  totalCustomers: number
  totalOnboarded: number
  totalCompleted: number
  totalInProgress: number
  totalPending: number
  totalDelayed: number
  presentUsers: number
  absentUsers: number
}

export interface OnboardingSummaryTrend {
  interval?: string
  labels: string[]
  newCustomers: number[]
  completed: number[]
  previousPeriod: number[]
}

export interface OnboardingSummaryTarget {
  target: number
  achieved: number
  remaining: number
  percentage: number
}

export interface OnboardingSummaryCount {
  count: number
  percentage: number
}

export interface OnboardingSummaryStatusBreakdown {
  pending: OnboardingSummaryCount
  inProgress: OnboardingSummaryCount
  completed: OnboardingSummaryCount
  delayed: OnboardingSummaryCount
}

export interface OnboardingSummaryDayCount {
  day: string
  count: number
}

export interface OnboardingSummaryDelayBreakdown {
  clientSide?: OnboardingSummaryCount
  ourSide?: OnboardingSummaryCount
  techOtherDepartment?: OnboardingSummaryCount
  available?: boolean
}

export interface OnboardingDashboardSummary {
  department?: OnboardingSummaryDepartment
  period?: OnboardingSummaryPeriod
  kpis: OnboardingSummaryKpis
  trend?: OnboardingSummaryTrend
  teamTarget?: OnboardingSummaryTarget
  statusBreakdown?: OnboardingSummaryStatusBreakdown
  mostActiveDay?: OnboardingSummaryDayCount[]
  delayBreakdown?: OnboardingSummaryDelayBreakdown
  totalDelayed?: number
}
