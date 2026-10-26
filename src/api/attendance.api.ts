import { authedApiRequest } from './client'

export interface HrmTodayAttendance {
  id?: number
  employeeId?: number
  employeeCode?: string
  employeeName?: string
  attendanceDate?: string
  status?: string // 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'ON_LEAVE'
  checkIn?: string | null
  checkOut?: string | null
  workingMinutes?: number | null
  checkInStatus?: string
  checkOutStatus?: string
  late?: boolean
}

export interface HrmAttendanceHistoryRecord {
  id?: number
  employeeId?: number
  employeeCode?: string
  employeeName?: string
  attendanceDate?: string
  status?: string
  checkIn?: string | null
  checkOut?: string | null
  workingMinutes?: number | null
  checkInStatus?: string
  checkOutStatus?: string
  late?: boolean
}

function unwrapPayload<T>(res: any): T | null {
  if (!res) return null
  // Handle double wrapped { data: { data: T } } or single wrapped { data: T }
  if (typeof res === 'object') {
    if ('data' in res && res.data !== null && res.data !== undefined) {
      const inner = res.data
      if (typeof inner === 'object' && 'data' in inner && inner.data !== null && inner.data !== undefined) {
        return inner.data as T
      }
      return inner as T
    }
  }
  return res as T
}

/**
 * Fetch authenticated employee's today attendance from HRM via SMSB.
 * GET /api/hrm/attendance/today
 */
export async function getTodayAttendance(): Promise<HrmTodayAttendance | null> {
  try {
    const res = await authedApiRequest<any>('/api/hrm/attendance/today')
    return unwrapPayload<HrmTodayAttendance>(res)
  } catch (err) {
    console.warn('[attendance.api] getTodayAttendance failed:', err)
    return null
  }
}

/**
 * Check-in authenticated employee in HRM via SMSB.
 * POST /api/hrm/attendance/check-in
 */
export async function checkInAttendance(): Promise<HrmTodayAttendance | null> {
  const res = await authedApiRequest<any>('/api/hrm/attendance/check-in', {
    method: 'POST',
    body: JSON.stringify({}),
  })
  return unwrapPayload<HrmTodayAttendance>(res)
}

/**
 * Check-out authenticated employee in HRM via SMSB.
 * PATCH /api/hrm/attendance/check-out
 */
export async function checkOutAttendance(): Promise<HrmTodayAttendance | null> {
  const res = await authedApiRequest<any>('/api/hrm/attendance/check-out', {
    method: 'PATCH',
    body: JSON.stringify({}),
  })
  return unwrapPayload<HrmTodayAttendance>(res)
}

/**
 * Fetch authenticated employee's attendance history from HRM via SMSB.
 * GET /api/hrm/attendance/history?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export async function getAttendanceHistory(
  from?: string,
  to?: string,
): Promise<HrmAttendanceHistoryRecord[]> {
  try {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    const qs = params.toString() ? `?${params.toString()}` : ''

    const res = await authedApiRequest<any>(`/api/hrm/attendance/history${qs}`)
    const payload = unwrapPayload<HrmAttendanceHistoryRecord[] | { content?: HrmAttendanceHistoryRecord[] }>(res)
    if (Array.isArray(payload)) return payload
    if (payload && Array.isArray((payload as any).content)) return (payload as any).content
    return []
  } catch (err) {
    console.warn('[attendance.api] getAttendanceHistory failed:', err)
    return []
  }
}

/**
 * Mark user absent or present in TaskCRM attendance table.
 * POST /api/attendance/user/absent?userId={userId}&updatingStatus={updatingStatus}
 */
export async function markUserAbsent(
  userId: number,
  isAbsent: boolean,
): Promise<{ success?: boolean; message?: string }> {
  // In SMSB: updatingStatus = !isAbsent (updatingStatus=false marks absent, true marks present)
  const updatingStatus = !isAbsent
  return authedApiRequest<{ success?: boolean; message?: string }>(
    `/api/attendance/user/absent?userId=${userId}&updatingStatus=${updatingStatus}`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  )
}

