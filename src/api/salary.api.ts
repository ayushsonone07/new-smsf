/**
 * Salary Management API
 *
 * Mirrors SMSF's salary endpoints using new-smsf's authedApiRequest pattern.
 */
import { authedApiRequest } from './client'

// ── Types ────────────────────────────────────────────────────────────────────

export interface UserSalaryResponse {
  salaryId: number | null
  userId: number
  username: string
  email: string
  target: number
  targetAchieved: boolean
  overTarget: number
  achievedCount: number
  incentiveAmount: number
  currentSalary: number
  lastMonthSalary: number
  createdAt: string | null
  lastUpdatedAt: string | null
  isAbsent: boolean
}

export interface UserSalaryUpdateRequest {
  userId: number
  newSalary?: number
  target?: number
  targetAchieved?: boolean
  overTarget?: number
  incentiveAmount?: number
}

interface SalaryApiResponse<T> {
  success: boolean
  message: string
  data: T
}

interface SalaryFetchParams {
  departmentType: string
  startDate?: string
  endDate?: string
}

// ── API functions ─────────────────────────────────────────────────────────────

export async function fetchSalaryHead(
  params: SalaryFetchParams,
): Promise<UserSalaryResponse | null> {
  const qs = new URLSearchParams({ departmentType: params.departmentType })
  if (params.startDate) qs.set('startDate', params.startDate)
  if (params.endDate) qs.set('endDate', params.endDate)

  const res = await authedApiRequest<SalaryApiResponse<UserSalaryResponse>>(
    `/api/salary/head?${qs.toString()}`,
  )
  return res?.success && res.data ? res.data : null
}

export async function fetchDepartmentSalaries(
  params: SalaryFetchParams,
): Promise<UserSalaryResponse[]> {
  const qs = new URLSearchParams({ departmentType: params.departmentType })
  if (params.startDate) qs.set('startDate', params.startDate)
  if (params.endDate) qs.set('endDate', params.endDate)

  const res = await authedApiRequest<SalaryApiResponse<UserSalaryResponse[]>>(
    `/api/salary/department?${qs.toString()}`,
  )
  return res?.success && res.data ? res.data : []
}

export async function searchUserSalaries(
  query: string,
): Promise<UserSalaryResponse[]> {
  const res = await authedApiRequest<SalaryApiResponse<UserSalaryResponse[]>>(
    `/api/salary/search?query=${encodeURIComponent(query)}`,
  )
  return res?.success && res.data ? res.data : []
}

export async function updateUserSalary(
  updatedBy: string,
  request: UserSalaryUpdateRequest,
): Promise<string> {
  const res = await authedApiRequest<SalaryApiResponse<string>>(
    `/api/salary/update?updatedBy=${encodeURIComponent(updatedBy)}`,
    {
      method: 'POST',
      body: JSON.stringify(request),
    },
  )
  return res?.message ?? 'Done'
}

export async function markUserStatus(
  userId: number,
  updatingStatus: boolean,
): Promise<string> {
  const res = await authedApiRequest<SalaryApiResponse<string>>(
    `/api/attendance/user/absent?userId=${userId}&updatingStatus=${updatingStatus}`,
    { method: 'POST', body: JSON.stringify({}) },
  )
  return res?.message ?? 'Done'
}

