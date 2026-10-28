import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DailyAttendanceCard } from '../../../../components/user/attendance/checkin'
import { AttendanceCalendar } from '../../../../components/user/attendance/calender'
import {
  getTodayAttendance,
  checkInAttendance,
  checkOutAttendance,
  getAttendanceHistory,
  markUserAbsent,
} from '../../../../api/attendance.api'
import { getSession } from '../../../../app/auth/session'
import { RefreshButton } from '../../../../components/ui/RefreshButton'
import { CheckCircle2, AlertCircle, X, AlertTriangle } from 'lucide-react'

function formatTimeString(timeStr?: string | null): string | null {
  if (!timeStr) return null
  const cleaned = timeStr.trim()
  const parts = cleaned.split(':')
  if (parts.length < 2) return cleaned
  let hours = parseInt(parts[0], 10)
  const minutes = parseInt(parts[1], 10)
  if (isNaN(hours) || isNaN(minutes)) return cleaned
  const ampm = hours >= 12 ? 'pm' : 'am'
  hours = hours % 12 || 12
  return `${hours}:${String(minutes).padStart(2, '0')} ${ampm}`
}

function formatErrorMessage(rawMessage?: string): { title: string; description?: string } {
  if (!rawMessage) {
    return { title: 'Something went wrong', description: 'Please try again or contact administrator.' }
  }

  if (rawMessage.includes('EMPLOYEE_NOT_FOUND_IN_HRM')) {
    return {
      title: 'Employee Not Linked in HRM',
      description: 'Your account is not registered or linked as an active employee in HRM. Please contact Admin / HR.',
    }
  }

  if (rawMessage.toLowerCase().includes('already checked in')) {
    return {
      title: 'Already Checked In',
      description: 'You have already checked in for today.',
    }
  }

  if (rawMessage.toLowerCase().includes('already checked out')) {
    return {
      title: 'Already Checked Out',
      description: 'You have already recorded your check-out for today.',
    }
  }

  return {
    title: rawMessage.replace(/_/g, ' '),
  }
}

/**
 * Head / user panel — Attendance.
 * Fully integrated with HRM attendance endpoints via SMSB:
 * - GET /api/hrm/attendance/today
 * - POST /api/hrm/attendance/check-in
 * - PATCH /api/hrm/attendance/check-out
 * - GET /api/hrm/attendance/history
 * - POST /api/attendance/user/absent
 */
export function AttendancePage() {
  const queryClient = useQueryClient()
  const session = getSession()

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() // 0-indexed
  const currentDay = now.getDate()

  const firstDayOfMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`
  const lastDayNumber = new Date(currentYear, currentMonth + 1, 0).getDate()
  const lastDayOfMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDayNumber).padStart(2, '0')}`

  const dateLabel = now.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })

  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'warning'
    title: string
    description?: string
  } | null>(null)

  function showToast(message: string, type: 'success' | 'error' | 'warning' = 'success') {
    if (type === 'error') {
      const parsed = formatErrorMessage(message)
      setToast({ type: 'error', title: parsed.title, description: parsed.description })
    } else {
      setToast({ type, title: message })
    }
    setTimeout(() => setToast(null), 5000)
  }

  // 1. Fetch Today's Attendance
  const todayQuery = useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: getTodayAttendance,
    refetchInterval: 30000, // Background poll every 30s
  })

  // 2. Fetch Month Attendance History
  const historyQuery = useQuery({
    queryKey: ['attendance', 'history', firstDayOfMonth, lastDayOfMonth],
    queryFn: () => getAttendanceHistory(firstDayOfMonth, lastDayOfMonth),
    refetchInterval: 60000,
  })

  // Check-In Mutation
  const checkInMutation = useMutation({
    mutationFn: checkInAttendance,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
      showToast(data?.employeeName ? `Checked in successfully for ${data.employeeName}!` : 'Checked in successfully!', 'success')
    },
    onError: (err: any) => {
      showToast(err?.message || 'Check-in failed. Please try again.', 'error')
    },
  })

  // Check-Out Mutation
  const checkOutMutation = useMutation({
    mutationFn: checkOutAttendance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
      showToast('Checked out successfully!', 'success')
    },
    onError: (err: any) => {
      showToast(err?.message || 'Check-out failed. Please try again.', 'error')
    },
  })

  // Mark Leave Mutation
  const markLeaveMutation = useMutation({
    mutationFn: async () => {
      const userId = session?.user?.id
      if (typeof userId === 'number') {
        await markUserAbsent(userId, true)
      } else {
        throw new Error('User identifier not found')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
      showToast('Today has been marked as leave / absent.', 'success')
    },
    onError: (err: any) => {
      showToast(err?.message || 'Failed to update leave status.', 'error')
    },
  })

  const todayData = todayQuery.data
  const historyList = useMemo(() => historyQuery.data ?? [], [historyQuery.data])

  // Derive check-in and check-out times
  const checkInFormatted = formatTimeString(todayData?.checkIn)
  const checkOutFormatted = formatTimeString(todayData?.checkOut)
  const isWorking = Boolean(todayData?.checkIn && !todayData?.checkOut)

  // Derive status
  const rawStatus = (todayData?.status || '').toUpperCase()
  let statusText = 'Present'
  let isPresent = true

  if (rawStatus === 'ABSENT' || rawStatus === 'ON_LEAVE' || rawStatus === 'LEAVE') {
    statusText = 'Absent'
    isPresent = false
  } else if (rawStatus === 'HALF_DAY') {
    statusText = 'Half Day'
    isPresent = true
  } else if (todayData?.checkIn) {
    statusText = 'Present'
    isPresent = true
  } else {
    statusText = 'Pending'
    isPresent = false
  }

  // Derive month stats and calendar days
  const { presentDays, absentDays, stats } = useMemo(() => {
    const pDays: number[] = []
    const aDays: number[] = []

    historyList.forEach((record) => {
      if (!record.attendanceDate) return
      const parts = record.attendanceDate.split('-').map(Number)
      if (parts.length >= 3) {
        const y = parts[0]
        const m = parts[1]
        const d = parts[2]
        if (y === currentYear && m === currentMonth + 1) {
          const st = (record.status || '').toUpperCase()
          if (st === 'ABSENT' || st === 'ON_LEAVE' || st === 'LEAVE') {
            if (!aDays.includes(d)) aDays.push(d)
          } else if (st === 'PRESENT' || st === 'HALF_DAY' || record.checkIn) {
            if (!pDays.includes(d)) pDays.push(d)
          }
        }
      }
    })

    // If today is checked in and not yet in history
    if (todayData?.checkIn && !pDays.includes(currentDay)) {
      pDays.push(currentDay)
    }

    const presentCount = pDays.length
    const absentCount = aDays.length
    const totalDays = presentCount + absentCount
    const percentage = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 100

    return {
      presentDays: pDays,
      absentDays: aDays,
      stats: {
        present: presentCount,
        absent: absentCount,
        percentage,
      },
    }
  }, [historyList, todayData?.checkIn, currentYear, currentMonth, currentDay])

  function handleCheckIn() {
    checkInMutation.mutate()
  }

  function handleCheckOut() {
    checkOutMutation.mutate()
  }

  function handleMarkLeave() {
    if (window.confirm('Are you sure you want to mark today as leave / absent?')) {
      markLeaveMutation.mutate()
    }
  }

  const isActionLoading =
    checkInMutation.isPending || checkOutMutation.isPending || markLeaveMutation.isPending

  return (
    <div className="relative p-6 max-w-7xl">
      {/* Toast Popup Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-start gap-3.5 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.16)] max-w-sm w-full animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${
              toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-600 ring-4 ring-emerald-50/50'
                : toast.type === 'warning'
                ? 'bg-amber-50 text-amber-600 ring-4 ring-amber-50/50'
                : 'bg-rose-50 text-rose-600 ring-4 ring-rose-50/50'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : toast.type === 'warning' ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <h4 className="text-[14px] font-semibold text-slate-900 leading-snug">
              {toast.title}
            </h4>
            {toast.description && (
              <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
                {toast.description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setToast(null)}
            className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex justify-end">
            <RefreshButton
              onRefresh={() => todayQuery.refetch()}
              isRefreshing={todayQuery.isFetching}
              label="today's attendance"
            />
          </div>
          <DailyAttendanceCard
            date={dateLabel}
            checkInTime={checkInFormatted}
            checkOutTime={checkOutFormatted}
            isPresent={isPresent}
            statusText={statusText}
            isWorking={isWorking}
            stats={stats}
            isLoading={isActionLoading}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            onMarkLeave={handleMarkLeave}
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-end">
            <RefreshButton
              onRefresh={() => historyQuery.refetch()}
              isRefreshing={historyQuery.isFetching}
              label="attendance history"
            />
          </div>
          <AttendanceCalendar
            month={currentMonth}
            year={currentYear}
            absentDays={absentDays}
            presentDays={presentDays}
            currentDay={currentDay}
          />
        </div>
      </div>
    </div>
  )
}
