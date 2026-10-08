import { useState } from 'react'
import { DailyAttendanceCard } from '../../../../components/user/attendance/checkin'
import { AttendanceCalendar } from '../../../../components/user/attendance/calender'

/**
 * Head / user panel — Attendance. Composes the shared
 * user/attendance widgets (daily check-in card + month
 * calendar) inside the console shell.
 */
export function AttendancePage() {
  const now = new Date()
  const dateLabel = now.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
  const timeLabel = now.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  const [checkOutTime, setCheckOutTime] = useState<string | null>(null)
  const [onLeave, setOnLeave] = useState(false)

  const isPresent = !onLeave

  function handleCheckOut() {
    setCheckOutTime(timeLabel)
  }

  function handleMarkLeave() {
    if (window.confirm('Are you sure you want to mark today as leave?')) {
      setOnLeave(true)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
      <DailyAttendanceCard
        date={dateLabel}
        checkInTime="9:42 am"
        checkOutTime={checkOutTime}
        isPresent={isPresent}
        isWorking={!checkOutTime}
        stats={{ present: 23, absent: 3, percentage: 88 }}
        onCheckOut={handleCheckOut}
        onMarkLeave={handleMarkLeave}
      />

      <AttendanceCalendar
        month={now.getMonth()}
        year={now.getFullYear()}
        absentDays={[3, 17, 24]}
        currentDay={now.getDate()}
      />
    </div>
  )
}