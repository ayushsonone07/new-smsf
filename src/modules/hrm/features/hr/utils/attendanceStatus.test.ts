import { describe, expect, it } from 'vitest'
import {
  ATTENDANCE_STATUS_COLORS,
  checkInStatusClass,
  checkOutStatusClass,
  countAttendanceStatuses,
  formatAttendanceStatus,
  resolveCheckInStatus,
  resolveCheckOutStatus,
} from './attendanceStatus'

describe('formatAttendanceStatus', () => {
  it('turns enum values into title case', () => {
    expect(formatAttendanceStatus('ON_TIME_CHECK_IN')).toBe('On Time Check In')
    expect(formatAttendanceStatus('NOT_CHECKED_OUT')).toBe('Not Checked Out')
  })
})

describe('status resolution', () => {
  it('prefers the explicit check-in status', () => {
    expect(resolveCheckInStatus({ checkIn: '09:00', checkInStatus: 'LATE_CHECK_IN' })).toBe(
      'LATE_CHECK_IN',
    )
  })

  it('derives the check-in status when missing', () => {
    expect(resolveCheckInStatus({ checkIn: '09:00', checkInStatus: null })).toBe(
      'ON_TIME_CHECK_IN',
    )
    expect(resolveCheckInStatus({ checkIn: null, checkInStatus: null })).toBe(
      'NOT_CHECKED_IN',
    )
  })

  it('derives the check-out status when missing', () => {
    expect(resolveCheckOutStatus({ checkOut: '18:00', checkOutStatus: null })).toBe(
      'ON_TIME_CHECK_OUT',
    )
    expect(resolveCheckOutStatus({ checkOut: null, checkOutStatus: null })).toBe(
      'NOT_CHECKED_OUT',
    )
  })
})

describe('status classes', () => {
  it('maps check-in statuses to semantic classes', () => {
    expect(checkInStatusClass('LATE_CHECK_IN')).toContain('warning')
    expect(checkInStatusClass('NOT_CHECKED_IN')).toContain('danger')
    expect(checkInStatusClass('EARLY_CHECK_IN')).toContain('info')
    expect(checkInStatusClass('ON_TIME_CHECK_IN')).toContain('success')
  })

  it('maps check-out statuses to semantic classes', () => {
    expect(checkOutStatusClass('LATE_CHECK_OUT')).toContain('warning')
    expect(checkOutStatusClass('NOT_CHECKED_OUT')).toContain('muted')
    expect(checkOutStatusClass('EARLY_CHECK_OUT')).toContain('info')
    expect(checkOutStatusClass('ON_TIME_CHECK_OUT')).toContain('success')
  })
})

describe('countAttendanceStatuses', () => {
  const records = [
    { checkIn: '09:00', checkInStatus: 'ON_TIME_CHECK_IN', checkOut: '18:00', checkOutStatus: 'ON_TIME_CHECK_OUT' },
    { checkIn: '09:30', checkInStatus: 'LATE_CHECK_IN', checkOut: '18:00', checkOutStatus: 'ON_TIME_CHECK_OUT' },
    { checkIn: '09:30', checkInStatus: 'LATE_CHECK_IN', checkOut: '17:00', checkOutStatus: 'EARLY_CHECK_OUT' },
    { checkIn: null, checkInStatus: 'NOT_CHECKED_IN', checkOut: null, checkOutStatus: 'NOT_CHECKED_OUT' },
  ]

  it('counts and sorts check-in statuses by frequency', () => {
    expect(countAttendanceStatuses(records, 'checkIn')).toEqual([
      { status: 'LATE_CHECK_IN', count: 2, pct: 50, color: ATTENDANCE_STATUS_COLORS.LATE_CHECK_IN },
      { status: 'ON_TIME_CHECK_IN', count: 1, pct: 25, color: ATTENDANCE_STATUS_COLORS.ON_TIME_CHECK_IN },
      { status: 'NOT_CHECKED_IN', count: 1, pct: 25, color: ATTENDANCE_STATUS_COLORS.NOT_CHECKED_IN },
    ])
  })

  it('counts check-out statuses', () => {
    expect(countAttendanceStatuses(records, 'checkOut')).toEqual([
      { status: 'ON_TIME_CHECK_OUT', count: 2, pct: 50, color: ATTENDANCE_STATUS_COLORS.ON_TIME_CHECK_OUT },
      { status: 'EARLY_CHECK_OUT', count: 1, pct: 25, color: ATTENDANCE_STATUS_COLORS.EARLY_CHECK_OUT },
      { status: 'NOT_CHECKED_OUT', count: 1, pct: 25, color: ATTENDANCE_STATUS_COLORS.NOT_CHECKED_OUT },
    ])
  })

  it('returns an empty list for no records', () => {
    expect(countAttendanceStatuses([], 'checkIn')).toEqual([])
  })

  it('uses a neutral color for unmapped statuses', () => {
    const [entry] = countAttendanceStatuses(
      [{ checkIn: '09:00', checkInStatus: 'SOMETHING_NEW', checkOut: null, checkOutStatus: null }],
      'checkIn',
    )
    expect(entry).toMatchObject({ status: 'SOMETHING_NEW', count: 1, pct: 100, color: '#64748b' })
  })
})
