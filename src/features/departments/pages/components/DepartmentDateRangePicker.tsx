import { useState, useEffect, useRef, useMemo } from 'react'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'

export interface DepartmentDateRangePickerProps {
  startDate?: Date
  endDate?: Date
  onDateChange: (start: Date | undefined, end: Date | undefined) => void
  onReset?: () => void
  placeholder?: string
  isLoading?: boolean
}

interface QuickPreset {
  label: string
  days: number
}

const PRESETS: QuickPreset[] = [
  { label: 'Today', days: 1 },
  { label: 'Last 3 days', days: 3 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 15 days', days: 15 },
  { label: 'Last 30 days', days: 30 },
]

const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
const endOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)

const isSameDay = (a?: Date, b?: Date): boolean => {
  if (!a || !b) return false
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

const formatDateShort = (d: Date): string =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export function DepartmentDateRangePicker({
  startDate,
  endDate,
  onDateChange,
  onReset,
  placeholder = 'Select date range',
  isLoading = false,
}: DepartmentDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [leftMonth, setLeftMonth] = useState<Date>(() => startOfDay(startDate || new Date()))
  const [rightMonth, setRightMonth] = useState<Date>(() => {
    const base = startDate || new Date()
    return new Date(base.getFullYear(), base.getMonth() + 1, 1)
  })

  const [tempStart, setTempStart] = useState<Date | undefined>(startDate)
  const [tempEnd, setTempEnd] = useState<Date | undefined>(endDate)
  const [hoverDate, setHoverDate] = useState<Date | null>(null)
  const [selecting, setSelecting] = useState<'start' | 'end' | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)

  const today = useMemo(() => startOfDay(new Date()), [])

  useEffect(() => {
    setTempStart(startDate)
    setTempEnd(endDate)
  }, [startDate, endDate])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const prevMonth = () => {
    setLeftMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
    setRightMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setLeftMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
    setRightMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const handleQuickPreset = (days: number) => {
    const end = endOfDay(new Date())
    const start = startOfDay(new Date())
    start.setDate(start.getDate() - (days - 1))

    setTempStart(start)
    setTempEnd(end)
    setSelecting(null)
    onDateChange(start, end)
    setIsOpen(false)
  }

  const handleReset = () => {
    setTempStart(undefined)
    setTempEnd(undefined)
    setSelecting(null)
    if (onReset) onReset()
    else onDateChange(undefined, undefined)
    setIsOpen(false)
  }

  const handleDayClick = (day: Date) => {
    if (day > today) return // Disable future

    if (!selecting || selecting === 'start') {
      setTempStart(startOfDay(day))
      setTempEnd(undefined)
      setSelecting('end')
    } else {
      let finalStart = tempStart
      let finalEnd = endOfDay(day)

      if (tempStart && day < tempStart) {
        finalEnd = endOfDay(tempStart)
        finalStart = startOfDay(day)
      }

      setTempStart(finalStart)
      setTempEnd(finalEnd)
      setSelecting(null)

      if (finalStart && finalEnd) {
        onDateChange(finalStart, finalEnd)
        setIsOpen(false)
      }
    }
  }

  const isInRange = (d: Date): boolean => {
    const time = d.getTime()
    if (selecting === 'end' && tempStart && hoverDate) {
      const min = Math.min(tempStart.getTime(), hoverDate.getTime())
      const max = Math.max(tempStart.getTime(), hoverDate.getTime())
      return time >= min && time <= max
    }
    if (tempStart && tempEnd) {
      return time >= tempStart.getTime() && time <= tempEnd.getTime()
    }
    return false
  }

  const renderMonth = (month: Date, isLeft: boolean) => {
    const year = month.getFullYear()
    const m = month.getMonth()
    const firstDay = new Date(year, m, 1)
    const lastDay = new Date(year, m + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay() // 0 = Sun

    const days: (Date | null)[] = []
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, m, i))
    }

    const monthLabel = month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

    return (
      <div className="w-60">
        <div className="flex items-center justify-between mb-2">
          {isLeft ? (
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : (
            <div className="w-6" />
          )}
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            {monthLabel}
          </span>
          {!isLeft ? (
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <div className="w-6" />
          )}
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400 mb-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 text-xs">
          {days.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} className="h-7 w-7" />
            }

            const isStart = tempStart && isSameDay(day, tempStart)
            const isEnd = tempEnd && isSameDay(day, tempEnd)
            const inRange = isInRange(day) && !isStart && !isEnd
            const isFuture = day > today
            const isCurrent = isSameDay(day, today)

            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={isFuture || isLoading}
                onClick={() => handleDayClick(day)}
                onMouseEnter={() => setHoverDate(day)}
                className={`h-7 w-7 rounded-lg text-xs font-medium flex items-center justify-center transition-colors cursor-pointer ${
                  isStart || isEnd
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : inRange
                    ? 'bg-indigo-50 text-indigo-700 rounded-none'
                    : isCurrent
                    ? 'border border-indigo-300 text-indigo-600 font-bold hover:bg-indigo-50'
                    : isFuture
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {day.getDate()}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const displayText = useMemo(() => {
    if (tempStart && tempEnd) {
      return `${formatDateShort(tempStart)} ~ ${formatDateShort(tempEnd)}`
    }
    if (tempStart) {
      return `${formatDateShort(tempStart)} ~`
    }
    return placeholder
  }, [tempStart, tempEnd, placeholder])

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={isLoading}
        className={`inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium shadow-xs transition-colors hover:bg-slate-50 cursor-pointer ${
          tempStart || tempEnd ? 'text-indigo-600 border-indigo-200' : 'text-slate-600'
        } ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <Calendar className="h-3.5 w-3.5 text-indigo-500" />
        <span className="whitespace-nowrap">{displayText}</span>
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 flex flex-col sm:flex-row rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Presets Sidebar */}
          <div className="w-full sm:w-36 border-b sm:border-b-0 sm:border-r border-slate-100 bg-slate-50/70 p-3 flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-0.5">
              Quick Ranges
            </span>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handleQuickPreset(p.days)}
                className="w-full text-left rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-white hover:text-indigo-600 hover:shadow-xs transition-colors cursor-pointer font-medium"
              >
                {p.label}
              </button>
            ))}

            <div className="mt-auto pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={handleReset}
                className="w-full text-left rounded-lg px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer font-semibold flex items-center gap-1.5"
              >
                <X className="h-3.5 w-3.5" /> Reset Filter
              </button>
            </div>
          </div>

          {/* Calendars */}
          <div className="p-4 flex flex-col md:flex-row gap-6">
            {renderMonth(leftMonth, true)}
            <div className="hidden md:block">{renderMonth(rightMonth, false)}</div>
          </div>
        </div>
      )}
    </div>
  )
}

