import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, type Variants } from 'framer-motion'
import { Icon } from '../shared/Icon'
import './CustomersList.css'

export type CustomerTab = 'all' | 'pending' | 'in-progress' | 'completed'

export interface TabCounts {
  all?: number
  pending?: number
  inProgress?: number
  completed?: number
}

export interface AssigneeOption {
  id: string
  name: string
}

export interface CustomersListFiltersProps {
  showStatusTabs?: boolean
  /** Active status tab */
  activeTab: CustomerTab
  onTabChange: (tab: CustomerTab) => void
  tabCounts: TabCounts

  /** Search input shown between the tabs and the Date filters button */
  searchSlot: ReactNode

  /** "Created between" range */
  dateFrom: string
  dateTo: string
  onDateChange: (from: string, to: string) => void

  /**
   * "Completed between" range (optional).
   * Pass these once the API supports it; until then the inputs keep their own value.
   */
  completedFrom?: string
  completedTo?: string
  onCompletedChange?: (from: string, to: string) => void

  /* Accepted so existing pages keep compiling; this header doesn't show them. */
  assignees?: AssigneeOption[]
  selectedAssigneeId?: string | null | 'all'
  onAssigneeChange?: (id: string | null | 'all') => void
  onReset?: () => void
  onRefresh?: () => void
  /** Extra action buttons rendered after "Date filters" (e.g. round-robin toggle). */
  actionsSlot?: ReactNode
}

const TABS: { key: CustomerTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'in-progress', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
]

const FUNNEL_ICON = 'M22 3H2l8 9.46V19l4 2v-8.54L22 3Z'

const controlsVariants: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.24 } },
}

const panelVariants: Variants = {
  hidden: { opacity: 0, y: -6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.16 } },
}

const QUICK_RANGES = [
  { label: 'Today', days: 1 },
  { label: 'Last 3 days', days: 3 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 15 days', days: 15 },
  { label: 'Last 30 days', days: 30 },
] as const

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date: Date, amount: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function shiftMonth(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

function formatRangeDate(value: string): string {
  if (!value) return ''
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function CalendarMonth({
  month,
  startDate,
  endDate,
  onSelect,
}: {
  month: Date
  startDate: string
  endDate: string
  onSelect: (value: string) => void
}) {
  const firstDay = monthStart(month)
  const gridStart = addDays(firstDay, -firstDay.getDay())
  const today = toLocalDateString(new Date())
  const monthLabel = month.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })
  const days = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index))

  return (
    <div className="cl-calendar-month">
      <div className="cl-calendar-month__title">{monthLabel}</div>
      <div className="cl-calendar-grid cl-calendar-grid--weekdays">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="cl-calendar-grid">
        {days.map((date) => {
          const value = toLocalDateString(date)
          const inMonth = date.getMonth() === month.getMonth()
          const selected = value === startDate || value === endDate
          const inRange = Boolean(startDate && endDate && value > startDate && value < endDate)
          const isFuture = value > today

          return (
            <button
              key={value}
              type="button"
              className={[
                'cl-calendar-day',
                !inMonth && 'is-outside',
                selected && 'is-selected',
                inRange && 'is-in-range',
              ].filter(Boolean).join(' ')}
              disabled={isFuture}
              aria-label={date.toLocaleDateString('en-US', {
                dateStyle: 'full',
              })}
              aria-pressed={selected}
              onClick={() => onSelect(value)}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function DateRangePicker({
  label,
  from,
  to,
  onChange,
  onReset,
}: {
  label: string
  from: string
  to: string
  onChange: (from: string, to: string) => void
  onReset: () => void
}) {
  const [open, setOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState(() =>
    monthStart(from ? new Date(`${from}T00:00:00`) : new Date()),
  )
  const [draftFrom, setDraftFrom] = useState(from)
  const [draftTo, setDraftTo] = useState(to)
  const pickerRef = useRef<HTMLDivElement>(null)
  const hasRange = Boolean(from || to)
  const buttonLabel = from && to
    ? `${formatRangeDate(from)} – ${formatRangeDate(to)}`
    : from || to
      ? formatRangeDate(from || to)
      : 'Select date range'

  useEffect(() => {
    if (!open) return

    function closeOnOutsideClick(event: MouseEvent) {
      if (
        event.target instanceof Node &&
        !pickerRef.current?.contains(event.target)
      ) {
        setOpen(false)
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  function showPicker() {
    setDraftFrom(from)
    setDraftTo(to)
    setViewMonth(monthStart(from ? new Date(`${from}T00:00:00`) : new Date()))
    setOpen((current) => !current)
  }

  function selectDate(value: string) {
    if (!draftFrom || draftTo || value < draftFrom) {
      setDraftFrom(value)
      setDraftTo('')
      return
    }

    setDraftTo(value)
    onChange(draftFrom, value)
    setOpen(false)
  }

  function selectQuickRange(days: number) {
    const end = toLocalDateString(new Date())
    const start = toLocalDateString(addDays(new Date(), -(days - 1)))
    onChange(start, end)
    setDraftFrom(start)
    setDraftTo(end)
    setOpen(false)
  }

  function resetRange() {
    setDraftFrom('')
    setDraftTo('')
    onReset()
    setOpen(false)
  }

  return (
    <div className="cl-range-picker" ref={pickerRef}>
      <button
        type="button"
        className={`cl-range-picker__trigger${open ? ' is-open' : ''}${hasRange ? ' has-range' : ''}`}
        onClick={showPicker}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Icon name="calendarSmall" size={20} />
        <span>{buttonLabel}</span>
      </button>

      {open && (
        <div className="cl-date-picker" role="dialog" aria-label={`${label} date range`}>
          <aside className="cl-date-picker__presets">
            {QUICK_RANGES.map((range) => (
              <button
                key={range.label}
                type="button"
                onClick={() => selectQuickRange(range.days)}
              >
                {range.label}
              </button>
            ))}
            <button
              type="button"
              className="cl-date-picker__reset"
              onClick={resetRange}
            >
              Reset Filter
            </button>
          </aside>

          <div className="cl-date-picker__calendar">
            <div className="cl-date-picker__month-nav">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => setViewMonth((month) => shiftMonth(month, -1))}
              >
                <Icon name="chevronLeft" size={18} />
              </button>
              <span>
                {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <span>
                {shiftMonth(viewMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => setViewMonth((month) => shiftMonth(month, 1))}
              >
                <Icon name="chevronRight" size={18} />
              </button>
            </div>

            <div className="cl-date-picker__months">
              <CalendarMonth
                month={viewMonth}
                startDate={draftFrom}
                endDate={draftTo}
                onSelect={selectDate}
              />
              <CalendarMonth
                month={shiftMonth(viewMonth, 1)}
                startDate={draftFrom}
                endDate={draftTo}
                onSelect={selectDate}
              />
            </div>
            <p className="cl-date-picker__hint">
              {!draftFrom || draftTo ? 'Select a start date' : 'Select an end date'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Customer list header:
 *   [ status tabs ]  [ search ........ ]  [ Date filters ]
 * "Date filters" opens a panel with "Created between" and
 * "Completed between". Each range button opens quick presets and
 * a two-month calendar.
 */
export function CustomersListFilters({
  activeTab,
  onTabChange,
  tabCounts,
  searchSlot,
  dateFrom,
  dateTo,
  onDateChange,
  completedFrom,
  completedTo,
  onCompletedChange,
  showStatusTabs = true,
  actionsSlot,
}: CustomersListFiltersProps) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [localCompleted, setLocalCompleted] = useState({ from: '', to: '' })

  const doneFrom = completedFrom ?? localCompleted.from
  const doneTo = completedTo ?? localCompleted.to

  function changeCompleted(from: string, to: string) {
    if (onCompletedChange) onCompletedChange(from, to)
    else setLocalCompleted({ from, to })
  }

  function countFor(key: CustomerTab) {
    if (key === 'all') return tabCounts.all
    if (key === 'pending') return tabCounts.pending
    if (key === 'in-progress') return tabCounts.inProgress
    return tabCounts.completed
  }

  const activeFilterCount =
    (dateFrom || dateTo ? 1 : 0) + (doneFrom || doneTo ? 1 : 0)

  return (
    <motion.div
      className="cl-controls"
      variants={controlsVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Header: tabs | search | Date filters ── */}
      <div className="cl-header-row">
        {showStatusTabs !== false && (
          <div
            className="cl-tabs"
            role="tablist"
            aria-label="Filter by onboarding status"
          >
            {TABS.map((tab) => {
              const count = countFor(tab.key)

              return (
                <motion.button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  className={`cl-tab${activeTab === tab.key ? ' is-active' : ''}`}
                  onClick={() => onTabChange(tab.key)}
                  whileTap={{ scale: 0.95 }}
                >
                  {tab.label}
                  {typeof count === 'number' && Number.isFinite(count) && (
                    <span className="cl-tab__count">{count}</span>
                  )}
                </motion.button>
              )
            })}
          </div>
        )}

        {searchSlot}

        <motion.button
          type="button"
          className={`cl-filter-btn${filtersOpen ? ' is-open' : ''}`}
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
          aria-controls="cl-filter-panel"
          whileTap={{ scale: 0.96 }}
        >
          <Icon name="eye" d={FUNNEL_ICON} size={16} strokeWidth={2} />
          Date filters
          {activeFilterCount > 0 && (
            <span className="cl-filter-badge">{activeFilterCount}</span>
          )}
        </motion.button>

        {actionsSlot}
      </div>

      {/* ── Date filters panel ── */}
      {filtersOpen && (
        <motion.div
          id="cl-filter-panel"
          className="cl-filter-panel"
          variants={panelVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="cl-range">
            <div className="cl-range__head">
              <span className="cl-range__title">Created between</span>
              <button
                type="button"
                className="cl-range__reset"
                onClick={() => onDateChange('', '')}
              >
                Reset
              </button>
            </div>
            <DateRangePicker
              label="Created between"
              from={dateFrom}
              to={dateTo}
              onChange={onDateChange}
              onReset={() => onDateChange('', '')}
            />
          </div>

          <div className="cl-range">
            <div className="cl-range__head">
              <span className="cl-range__title cl-range__title--green">
                Completed between
              </span>
              <button
                type="button"
                className="cl-range__reset"
                onClick={() => changeCompleted('', '')}
              >
                Reset
              </button>
            </div>
            <DateRangePicker
              label="Completed between"
              from={doneFrom}
              to={doneTo}
              onChange={changeCompleted}
              onReset={() => changeCompleted('', '')}
            />
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
