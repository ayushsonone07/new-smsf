import { authedApiRequest } from './client'
import { getSession } from '../app/auth/session'
import type {
  OnboardingDashboardSummary,
} from '../features/departments/types/onboarding-dashboard.types'

/**
 * `GET /api/onboarding/dashboard/summary` — counts for the
 * onboarding dashboard (KPIs, trend, target, status breakdown,
 * most active day, delay split).
 *
 * Requires the login JWT plus a `username` header equal to the
 * token's `sub` claim (the account email) — both are added by
 * `authedApiRequest`. The backend scopes the numbers to the
 * requester: department USER → own work, head → whole team.
 */
export interface OnboardingSummaryParams {
  /** `YYYY-MM-DD`. Both dates are the same day for "Today". */
  startDate?: string
  endDate?: string
  allTime?: boolean
  /** Backend enum, defaults to the session's `departmentType`. */
  department?: string
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

  return authedApiRequest<OnboardingDashboardSummary>(
    `/api/onboarding/dashboard/summary?${search.toString()}`,
  )
}
