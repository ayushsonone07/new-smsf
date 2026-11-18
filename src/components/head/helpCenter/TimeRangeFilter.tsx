import { useState } from 'react'
import { Calendar, X, Clock, ChevronDown } from 'lucide-react'

export type TimeRangePreset =
  | 'all'
  | '3_days'
  | '7_days'
  | '10_days'
  | 'this_month'
  | 'previous_month'
  | '3_months'
  | 'custom'

export interface TimeRangeFilterValue {
  preset: TimeRangePreset
  days?: number
  months?: string
  period?: string
  startDate?: string
  endDate?: string
}

interface TimeRangeFilterProps {
  value: TimeRangeFilterValue
  onChange: (value: TimeRangeFilterValue) => void
  disabled?: boolean
  className?: string
}

const PRESETS: { key: TimeRangePreset; label: string; days?: number; months?: string }[] = [
  { key: 'all', label: 'All Time' },
  { key: '3_days', label: '3 Days', days: 3 },
  { key: '7_days', label: '7 Days', days: 7 },
  { key: '10_days', label: '10 Days', days: 10 },
  { key: 'this_month', label: 'This Month', months: 'this_month' },
  { key: 'previous_month', label: 'Previous Month', months: 'previous' },
  { key: '3_months', label: '3 Months', months: '3' },
  { key: 'custom', label: 'Custom' },
]

export function TimeRangeFilter({
  value,
  onChange,
  disabled = false,
  className = '',
}: TimeRangeFilterProps) {
  const [showCustomInputs, setShowCustomInputs] = useState(value.preset === 'custom')
  const [customStart, setCustomStart] = useState(value.startDate || '')
  const [customEnd, setCustomEnd] = useState(value.endDate || '')

  function handleSelectPreset(presetKey: TimeRangePreset) {
    if (disabled) return

    if (presetKey === 'custom') {
      setShowCustomInputs(true)
      onChange({
        preset: 'custom',
        startDate: customStart || undefined,
        endDate: customEnd || undefined,
      })
      return
    }

    setShowCustomInputs(false)
    const match = PRESETS.find((p) => p.key === presetKey)
    if (!match || match.key === 'all') {
      onChange({ preset: 'all' })
      return
    }

    onChange({
      preset: presetKey,
      days: match.days,
      months: match.months,
      period: presetKey,
    })
  }

  function handleApplyCustom() {
    if (!customStart && !customEnd) return
    onChange({
      preset: 'custom',
      startDate: customStart || undefined,
      endDate: customEnd || undefined,
    })
  }

  function handleReset() {
    setShowCustomInputs(false)
    setCustomStart('')
    setCustomEnd('')
    onChange({ preset: 'all' })
  }

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 p-2.5 sm:p-3 shadow-xs transition-all ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800">Filter by Date</span>
            <span className="hidden sm:inline-block text-[11px] text-slate-400 ml-1.5 font-medium">
              (Days, Months & Custom)
            </span>
          </div>
        </div>

        {/* Preset pill buttons */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin py-0.5 max-w-full">
          {PRESETS.map((p) => {
            const isActive = value.preset === p.key
            return (
              <button
                key={p.key}
                type="button"
                disabled={disabled}
                onClick={() => handleSelectPreset(p.key)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                } disabled:opacity-50`}
              >
                <span>{p.label}</span>
              </button>
            )
          })}

          {value.preset !== 'all' && (
            <button
              type="button"
              disabled={disabled}
              onClick={handleReset}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-1"
              title="Reset date filter"
            >
              <X className="h-3 w-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Custom date range picker if custom preset is active */}
      {showCustomInputs && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">From:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">To:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={handleApplyCustom}
            disabled={!customStart && !customEnd}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg text-xs transition-colors"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  )
}
