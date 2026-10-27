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
  autoOpen = false,
  hideTrigger = false,
  onDismiss,
}: {
  label: string
  from: string
  to: string
  onChange: (from: string, to: string) => void
  onReset: () => void
  autoOpen?: boolean
  hideTrigger?: boolean
  onDismiss?: () => void
}) {
  const [open, setOpen] = useState(autoOpen)
  const [viewMonth, setViewMonth] = useState(() =>
    monthStart(from ? new Date(`${from}T00:00:00`) : new Date()),
  )
  const [draftFrom, setDraftFrom] = useState(from)
  const [draftTo, setDraftTo] = useState(to)

  useEffect(() => {
    setDraftFrom(from)
    setDraftTo(to)
    if (from) {
      setViewMonth(monthStart(new Date(`${from}T00:00:00`)))
    }
  }, [from, to])
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
        onDismiss?.()
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        onDismiss?.()
      }
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
    onDismiss?.()
  }

  function selectQuickRange(days: number) {
    const end = toLocalDateString(new Date())
    const start = toLocalDateString(addDays(new Date(), -(days - 1)))
    onChange(start, end)
    setDraftFrom(start)
    setDraftTo(end)
    setOpen(false)
    onDismiss?.()
  }

  function resetRange() {
    setDraftFrom('')
    setDraftTo('')
    onChange('', '')
    onReset()
    setOpen(false)
    onDismiss?.()
  }

  return (
    <div className={`cl-range-picker${hideTrigger ? ' cl-range-picker--embedded' : ''}`} ref={pickerRef}>
      {!hideTrigger && <button
        type="button"
        className={`cl-range-picker__trigger${open ? ' is-open' : ''}${hasRange ? ' has-range' : ''}`}
        onClick={showPicker}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Icon name="calendarSmall" size={20} />
        <span>{buttonLabel}</span>
      </button>}

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
function AssigneeFilterDropdown({
  assignees = [],
  selectedAssigneeId = 'all',
  onChange,
}: {
  assignees?: AssigneeOption[]
  selectedAssigneeId?: string | null | 'all'
  onChange?: (id: string | null | 'all') => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const selectedAssignee = assignees.find((a) => a.id === selectedAssigneeId)
  const isFiltered = Boolean(selectedAssigneeId && selectedAssigneeId !== 'all')

  let buttonLabel = 'All Users'
  if (selectedAssignee) {
    buttonLabel = selectedAssignee.name.split(' (')[0] || selectedAssignee.name
  }

  const filteredAssignees = assignees.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.id.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="cl-assignee-filter" ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        className={`cl-range-picker__trigger${open ? ' is-open' : ''}${isFiltered ? ' has-range' : ''}`}
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          cursor: 'pointer',
          fontSize: '13px',
          padding: '0 14px',
          ...(isFiltered ? { color: '#2459e0', borderColor: '#3b82f6', background: '#eff6ff' } : {}),
        }}
        title="Filter by assigned user"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0 }}
          >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {buttonLabel}
          </span>
        </div>

        <svg
          viewBox="0 0 24 24"
          width="13"
          height="13"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: '100%',
            maxWidth: 260,
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            boxShadow: '0 8px 20px -4px rgba(15, 23, 42, 0.12), 0 3px 6px -2px rgba(15, 23, 42, 0.05)',
            padding: '5px',
            zIndex: 1000,
          }}
        >
          {/* All Users option */}
          <button
            type="button"
            onClick={() => {
              onChange?.('all')
              setOpen(false)
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 8px',
              border: 'none',
              borderRadius: '6px',
              background: !isFiltered ? '#eff6ff' : 'transparent',
              color: !isFiltered ? '#1d4ed8' : '#334155',
              fontWeight: !isFiltered ? 600 : 500,
              fontSize: '12px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span>All Users</span>
            {!isFiltered && <span style={{ fontWeight: 700 }}>✓</span>}
          </button>

          {assignees.length > 0 && (
            <>
              <div style={{ height: 1, background: '#f1f5f9', margin: '4px 0' }} />

              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  padding: '3px 6px',
                }}
              >
                Department Users ({assignees.length})
              </div>

              {assignees.length > 4 && (
                <div style={{ padding: '2px 4px 5px' }}>
                  <input
                    type="search"
                    placeholder="Search user..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '4px 7px',
                      fontSize: '11.5px',
                      borderRadius: '5px',
                      border: '1px solid #e2e8f0',
                      outline: 'none',
                    }}
                  />
                </div>
              )}

              <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {filteredAssignees.length === 0 ? (
                  <div style={{ padding: '6px', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
                    No users match "{search}"
                  </div>
                ) : (
                  filteredAssignees.map((user) => {
                    const isSelected = selectedAssigneeId === user.id
                    const initial = (user.name || user.id || 'U').charAt(0).toUpperCase()
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          onChange?.(user.id)
                          setOpen(false)
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 6px',
                          border: 'none',
                          borderRadius: '6px',
                          background: isSelected ? '#eff6ff' : 'transparent',
                          color: isSelected ? '#1d4ed8' : '#1e293b',
                          fontSize: '11.5px',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-grid',
                            placeItems: 'center',
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: isSelected ? '#3b82f6' : '#e2e8f0',
                            color: isSelected ? '#ffffff' : '#475569',
                            fontSize: '10px',
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {initial}
                        </span>
                        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                          <div style={{ fontWeight: isSelected ? 600 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user.name.split(' (')[0] || user.name}
                          </div>
                          {user.name.includes('(') && (
                            <div style={{ fontSize: '10px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {user.name.match(/\((.*?)\)/)?.[1] || user.id}
                            </div>
                          )}
                        </div>
                        {isSelected && <span style={{ color: '#1d4ed8', fontWeight: 700, fontSize: '11px' }}>✓</span>}
                      </button>
                    )
                  })
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

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
  onReset,
  assignees = [],
  selectedAssigneeId = 'all',
  onAssigneeChange,
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

  const isFilteredAssignee = Boolean(selectedAssigneeId && selectedAssigneeId !== 'all')
  const activeFilterCount =
    (dateFrom || dateTo ? 1 : 0) +
    (doneFrom || doneTo ? 1 : 0) +
    (isFilteredAssignee ? 1 : 0)

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
          Filter
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
          {onAssigneeChange && (
            <div className="cl-range">
              <div className="cl-range__head">
                <span className="cl-range__title">Assign to user</span>
                {isFilteredAssignee && (
                  <button
                    type="button"
                    className="cl-range__reset"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onAssigneeChange('all')
                    }}
                  >
                    Reset
                  </button>
                )}
              </div>
              <AssigneeFilterDropdown
                assignees={assignees}
                selectedAssigneeId={selectedAssigneeId}
                onChange={onAssigneeChange}
              />
            </div>
          )}

          <div className="cl-range">
            <div className="cl-range__head">
              <span className="cl-range__title">Created between</span>
              <button
                type="button"
                className="cl-range__reset"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onDateChange('', '')
                }}
              >
                Reset
              </button>
            </div>
            <DateRangePicker
              key={`created-${dateFrom}-${dateTo}`}
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
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  changeCompleted('', '')
                }}
              >
                Reset
              </button>
            </div>
            <DateRangePicker
              key={`completed-${doneFrom}-${doneTo}`}
              label="Completed between"
              from={doneFrom}
              to={doneTo}
              onChange={changeCompleted}
              onReset={() => changeCompleted('', '')}
            />
          </div>
          {activeFilterCount > 0 && (
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: '4px 8px' }}
                onClick={(e) => {
                  e.preventDefault()
                  onDateChange('', '')
                  changeCompleted('', '')
                  onAssigneeChange?.('all')
                  onReset?.()
                }}
              >
                Reset All Filters
              </button>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
