import { authedApiRequest } from './client'

/**
 * `GET /api/auth/admin/summary` — SUPERADMIN only (same API SMSF's SuperAdmin dashboard uses).
 * Counts customer services created in [startDate, endDate]. With `departmentType` the counts
 * are for services assigned to users of that department; without it, for all departments.
 * "Delayed" = not Completed / Cancelled and created more than 3 days ago.
 */
export interface AdminDepartmentSummary {
  departmentType: string | null
  totalCustomers: number
  pendingServices: number
  inProgressServices: number
  completedServices: number
  cancelledServices: number
  delayedServices: number
}

interface ApiEnvelope<T> {
  data?: T
  message?: string
  success?: boolean
}

/** Local date-time without zone (yyyy-MM-ddTHH:mm:ss), the format the backend parses. */
export function toLocalDateTimeParam(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  )
}

export async function getAdminDepartmentSummary(params: {
  departmentType?: string
  startDate: string
  endDate: string
}): Promise<AdminDepartmentSummary> {
  const search = new URLSearchParams({ startDate: params.startDate, endDate: params.endDate })
  if (params.departmentType) search.set('departmentType', params.departmentType)
  const response = await authedApiRequest<ApiEnvelope<AdminDepartmentSummary>>(
    `/api/auth/admin/summary?${search.toString()}`,
  )
  if (!response?.data) {
    throw new Error(response?.message || 'Department summary returned no data')
  }
  return response.data
}
