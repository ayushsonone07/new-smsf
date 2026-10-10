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
  showStatusTabs?: boolean
  onRefresh?: () => void
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

/**
 * Customer list header:
 *   [ status tabs ]  [ search ........ ]  [ Date filters ]
 * "Date filters" opens a panel with "Created between" and
 * "Completed between". The two groups sit side by side on wide
 * screens and stack on narrow ones.
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
            <div className="cl-range__inputs">
              <input
                type="date"
                aria-label="Created from"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => onDateChange(e.target.value, dateTo)}
              />
              <input
                type="date"
                aria-label="Created to"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => onDateChange(dateFrom, e.target.value)}
              />
            </div>
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
            <div className="cl-range__inputs">
              <input
                type="date"
                aria-label="Completed from"
                value={doneFrom}
                max={doneTo || undefined}
                onChange={(e) => changeCompleted(e.target.value, doneTo)}
              />
              <input
                type="date"
                aria-label="Completed to"
                value={doneTo}
                min={doneFrom || undefined}
                onChange={(e) => changeCompleted(doneFrom, e.target.value)}
              />
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
