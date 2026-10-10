import { useState, type ReactNode } from 'react'
import { motion, type Variants } from 'framer-motion'
import { Icon } from '../shared/Icon'

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
  activeTab: CustomerTab
  onTabChange: (tab: CustomerTab) => void
  tabCounts: TabCounts
  searchSlot: ReactNode
  dateFrom: string
  dateTo: string
  onDateChange: (from: string, to: string) => void
  completedFrom?: string
  completedTo?: string
  onCompletedChange?: (from: string, to: string) => void
  assignees?: AssigneeOption[]
  selectedAssigneeId?: string | null | 'all'
  onAssigneeChange?: (id: string | null | 'all') => void
  onReset?: () => void
  onRefresh?: () => void
}

const TABS: { key: CustomerTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'in-progress', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
]

const PRESETS = [
  { label: 'Today', days: 1 },
  { label: 'Last 3 days', days: 3 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 15 days', days: 15 },
  { label: 'Last 30 days', days: 30 },
]

const FUNNEL_ICON = 'M22 3H2l8 9.46V19l4 2v-8.54L22 3Z'
const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

const controlsVariants: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.24 } },
}

const panelVariants: Variants = {
  hidden: { opacity: 0, y: -6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.16 } },
}

function toDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function DateRangeCalendar({
  from,
  to,
  onChange,
}: {
  from: string
  to: string
  onChange: (from: string, to: string) => void
}) {
  const [firstMonth, setFirstMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  )

  function selectDate(value: string) {
    if (!from || to) {
      onChange(value, '')
      return
    }

    if (value < from) onChange(value, from)
    else onChange(from, value)
  }

  function selectPreset(days: number) {
    const today = new Date()
    const end = toDateValue(today)
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - days + 1)
    onChange(toDateValue(start), end)
    setFirstMonth(new Date(start.getFullYear(), start.getMonth(), 1))
  }

  function renderMonth(month: Date, monthIndex: number) {
    const year = month.getFullYear()
    const monthNumber = month.getMonth()
    const firstWeekday = (new Date(year, monthNumber, 1).getDay() + 6) % 7
    const daysInMonth = new Date(year, monthNumber + 1, 0).getDate()
    const cells = Array.from({ length: firstWeekday + daysInMonth }, (_, index) =>
      index < firstWeekday ? null : index - firstWeekday + 1,
    )

    return (
      <section className="cl-calendar__month" key={monthIndex}>
        <h4>{monthLabel(month)}</h4>
        <div className="cl-calendar__grid" role="grid" aria-label={monthLabel(month)}>
          {DAY_LABELS.map((label) => (
            <span className="cl-calendar__weekday" key={label}>{label}</span>
          ))}
          {cells.map((day, index) => {
            if (day === null) return <span className="cl-calendar__empty" key={`empty-${index}`} />
            const value = toDateValue(new Date(year, monthNumber, day))
            const isStart = value === from
            const isEnd = value === to
            const isInRange = Boolean(from && to && value > from && value < to)
            const isFuture = value > toDateValue(new Date())

            return (
              <button
                aria-label={value}
                aria-pressed={isStart || isEnd}
                className={[
                  'cl-calendar__day',
                  isStart ? 'is-start' : '',
                  isEnd ? 'is-end' : '',
                  isInRange ? 'is-in-range' : '',
                ].filter(Boolean).join(' ')}
                disabled={isFuture}
                key={value}
                onClick={() => selectDate(value)}
                type="button"
              >
                {day}
              </button>
            )
          })}
        </div>
      </section>
    )
  }

  const secondMonth = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + 1, 1)

  return (
    <div className="cl-calendar">
      <div className="cl-calendar__presets" aria-label="Date range shortcuts">
        {PRESETS.map((preset) => (
          <button
            className="cl-calendar__preset"
            key={preset.label}
            onClick={() => selectPreset(preset.days)}
            type="button"
          >
            {preset.label}
          </button>
        ))}
        <button className="cl-calendar__preset cl-calendar__preset--reset" onClick={() => onChange('', '')} type="button">
          Reset
        </button>
      </div>
      <div className="cl-calendar__months">
        <button
          aria-label="Previous month"
          className="cl-calendar__nav cl-calendar__nav--previous"
          onClick={() => setFirstMonth(new Date(firstMonth.getFullYear(), firstMonth.getMonth() - 1, 1))}
          type="button"
        >
          ‹
        </button>
        {renderMonth(firstMonth, 0)}
        {renderMonth(secondMonth, 1)}
        <button
          aria-label="Next month"
          className="cl-calendar__nav cl-calendar__nav--next"
          disabled={secondMonth.getFullYear() === new Date().getFullYear() && secondMonth.getMonth() === new Date().getMonth()}
          onClick={() => setFirstMonth(new Date(firstMonth.getFullYear(), firstMonth.getMonth() + 1, 1))}
          type="button"
        >
          ›
        </button>
      </div>
      <div className="cl-calendar__selected">
        {from || 'Start date'} <span>–</span> {to || 'End date'}
      </div>
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
}: CustomersListFiltersProps) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selectedDateFilter, setSelectedDateFilter] = useState<'created' | 'completed' | null>(null)
  const doneFrom = completedFrom ?? ''
  const doneTo = completedTo ?? ''

  function changeCompleted(from: string, to: string) {
    onCompletedChange?.(from, to)
  }

  function countFor(key: CustomerTab) {
    if (key === 'all') return tabCounts.all
    if (key === 'pending') return tabCounts.pending
    if (key === 'in-progress') return tabCounts.inProgress
    return tabCounts.completed
  }

  const activeFilterCount = Number(Boolean(dateFrom || dateTo)) + Number(Boolean(doneFrom || doneTo))
  const rangeFrom = selectedDateFilter === 'completed' ? doneFrom : dateFrom
  const rangeTo = selectedDateFilter === 'completed' ? doneTo : dateTo

  return (
    <motion.div className="cl-controls" variants={controlsVariants} initial="hidden" animate="visible">
      <div className="cl-header-row">
        {showStatusTabs && (
          <div className="cl-tabs" role="tablist" aria-label="Filter by onboarding status">
            {TABS.map((tab) => (
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
                <span className="cl-tab__count">{countFor(tab.key)}</span>
              </motion.button>
            ))}
          </div>
        )}
        {searchSlot}
        <motion.button
          type="button"
          className={`cl-filter-btn${filtersOpen ? ' is-open' : ''}`}
          onClick={() => {
            setFiltersOpen((open) => !open)
            setSelectedDateFilter(null)
          }}
          aria-expanded={filtersOpen}
          aria-controls="cl-filter-panel"
          whileTap={{ scale: 0.96 }}
        >
          <Icon name="eye" d={FUNNEL_ICON} size={16} strokeWidth={2} />
          Date filters
          {activeFilterCount > 0 && <span className="cl-filter-badge">{activeFilterCount}</span>}
        </motion.button>
      </div>

      {filtersOpen && (
        <motion.div
          id="cl-filter-panel"
          className="cl-filter-panel"
          variants={panelVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="cl-date-options" role="group" aria-label="Choose date filter">
            <button
              type="button"
              className={`cl-date-option${selectedDateFilter === 'created' ? ' is-selected' : ''}`}
              aria-expanded={selectedDateFilter === 'created'}
              onClick={() => setSelectedDateFilter(selectedDateFilter === 'created' ? null : 'created')}
            >
              Created date <span>{dateFrom && dateTo ? `${dateFrom} – ${dateTo}` : 'Choose range'}</span>
            </button>
            {onCompletedChange && (
              <button
                type="button"
                className={`cl-date-option${selectedDateFilter === 'completed' ? ' is-selected' : ''}`}
                aria-expanded={selectedDateFilter === 'completed'}
                onClick={() => setSelectedDateFilter(selectedDateFilter === 'completed' ? null : 'completed')}
              >
                Completion date <span>{doneFrom && doneTo ? `${doneFrom} – ${doneTo}` : 'Choose range'}</span>
              </button>
            )}
          </div>

          {selectedDateFilter && (
            <div className="cl-date-range">
              <div className="cl-range__head">
                <span className={`cl-range__title${selectedDateFilter === 'completed' ? ' cl-range__title--green' : ''}`}>
                  {selectedDateFilter === 'created' ? 'Created date range' : 'Completion date range'}
                </span>
                <button
                  type="button"
                  className="cl-range__reset"
                  onClick={() => selectedDateFilter === 'created' ? onDateChange('', '') : changeCompleted('', '')}
                >
                  Reset
                </button>
              </div>
              <DateRangeCalendar
                from={rangeFrom}
                to={rangeTo}
                onChange={selectedDateFilter === 'created' ? onDateChange : changeCompleted}
              />
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
