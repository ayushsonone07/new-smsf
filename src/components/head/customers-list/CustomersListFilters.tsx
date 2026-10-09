import { useState, useRef, useEffect, type ReactNode } from 'react'
import { motion, type Variants } from 'framer-motion'
import { Icon } from '../shared/Icon'
import { Avatar } from '../shared/Avatar'

export type CustomerTab = 'all' | 'pending' | 'in-progress' | 'completed'

export interface TabCounts {
  all: number
  pending: number
  inProgress: number
  completed: number
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

  /** Search input injected between tabs and right controls */
  searchSlot: ReactNode

  /** Assignee filter */
  assignees: AssigneeOption[]
  /** 'all' = all assignees, null = unassigned, string = specific assignee id */
  selectedAssigneeId: string | null | 'all'
  onAssigneeChange: (id: string | null | 'all') => void

  /** Date filter */
  dateFrom: string
  dateTo: string
  onDateChange: (from: string, to: string) => void

  /** Green button: reset all filters */
  onReset: () => void
}

const TABS: { key: CustomerTab; label: string }[] = [
  { key: 'all',        label: 'All' },
  { key: 'pending',    label: 'Pending' },
  { key: 'in-progress', label: 'In progress' },
  { key: 'completed',  label: 'Completed' },
]

const controlsVariants: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.24 } },
}

const menuVariants: Variants = {
  hidden: { opacity: 0, y: -5, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.14 },
  },
}

/**
 * Customer Onboarding filter controls.
 * Renders the full single-row control bar:
 *   [status tabs] [search slot] [assignee ▾] [Date filters] [green reset btn]
 *
 * The search slot is passed in by the parent page so the search bar
 * component stays separate as required by the architecture.
 *
 * All dropdown open/close state is managed internally.
 * All data and callbacks come from props.
 */
export function CustomersListFilters({
  activeTab,
  onTabChange,
  tabCounts,
  searchSlot,
  assignees,
  selectedAssigneeId,
  onAssigneeChange,
  dateFrom,
  dateTo,
  onDateChange,
  onReset,
}: CustomersListFiltersProps) {
  const [assigneeOpen, setAssigneeOpen] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)
  const [draftFrom, setDraftFrom] = useState(dateFrom)
  const [draftTo, setDraftTo] = useState(dateTo)

  const assigneeRef = useRef<HTMLDivElement>(null)
  const dateRef = useRef<HTMLDivElement>(null)

  /* Close dropdowns on outside click */
  useEffect(() => {
    if (!assigneeOpen && !dateOpen) return

    function handler(e: MouseEvent) {
      if (
        assigneeRef.current &&
        !assigneeRef.current.contains(e.target as Node)
      ) {
        setAssigneeOpen(false)
      }
      if (
        dateRef.current &&
        !dateRef.current.contains(e.target as Node)
      ) {
        setDateOpen(false)
      }
    }

    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [assigneeOpen, dateOpen])

  /* Count getter */
  function countFor(key: CustomerTab) {
    if (key === 'all')         return tabCounts.all
    if (key === 'pending')     return tabCounts.pending
    if (key === 'in-progress') return tabCounts.inProgress
    return tabCounts.completed
  }

  /* Assignee label */
  const selectedAssignee =
    typeof selectedAssigneeId === 'string' && selectedAssigneeId !== 'all'
      ? assignees.find((a) => a.id === selectedAssigneeId) ?? null
      : null

  const assigneeLabel =
    selectedAssigneeId === 'all'   ? 'All assignees' :
    selectedAssigneeId === null    ? 'Unassigned' :
    selectedAssignee?.name         ?? 'All assignees'

  const hasDateFilter = Boolean(dateFrom || dateTo)

  function handleDateApply() {
    onDateChange(draftFrom, draftTo)
    setDateOpen(false)
  }

  function handleDateReset() {
    setDraftFrom('')
    setDraftTo('')
    onDateChange('', '')
    setDateOpen(false)
  }

  return (
    <motion.div
      className="cl-controls"
      variants={controlsVariants}
      initial="hidden"
      animate="visible"
    >

      {/* ── Status tabs ── */}
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

      {/* ── Search (injected from parent) ── */}
      {searchSlot}

      {/* ── Assignee dropdown ── */}
      <div className="cl-assignee-wrap" ref={assigneeRef}>
        <motion.button
          type="button"
          className="cl-assignee-btn"
          onClick={() => setAssigneeOpen((o) => !o)}
          aria-expanded={assigneeOpen}
          aria-haspopup="listbox"
          whileTap={{ scale: 0.96 }}
        >
          {assigneeLabel}
          <Icon name="chevronDown" size={14} strokeWidth={2.5} />
        </motion.button>

        {assigneeOpen && (
          <motion.div
            className="cl-assignee-menu"
            role="listbox"
            aria-label="Filter by assignee"
            variants={menuVariants}
            initial="hidden"
            animate="visible"
          >
            <button
              type="button"
              role="option"
              aria-selected={selectedAssigneeId === 'all'}
              className={`cl-assignee-opt${selectedAssigneeId === 'all' ? ' is-selected' : ''}`}
              onClick={() => { onAssigneeChange('all'); setAssigneeOpen(false) }}
            >
              All assignees
            </button>

            {assignees.map((a) => (
              <button
                key={a.id}
                type="button"
                role="option"
                aria-selected={selectedAssigneeId === a.id}
                className={`cl-assignee-opt${selectedAssigneeId === a.id ? ' is-selected' : ''}`}
                onClick={() => { onAssigneeChange(a.id); setAssigneeOpen(false) }}
              >
                <Avatar name={a.name} size={20} tone="brand" />
                {a.name}
              </button>
            ))}

            <button
              type="button"
              role="option"
              aria-selected={selectedAssigneeId === null}
              className={`cl-assignee-opt${selectedAssigneeId === null ? ' is-selected' : ''}`}
              onClick={() => { onAssigneeChange(null); setAssigneeOpen(false) }}
            >
              <Avatar name="?" size={20} tone="muted" />
              Unassigned
            </button>
          </motion.div>
        )}
      </div>

      {/* ── Date filter ── */}
      <div className="cl-date-wrap" ref={dateRef}>
        <motion.button
          type="button"
          className={`cl-date-btn${hasDateFilter ? ' is-active' : ''}`}
          onClick={() => {
            if (!dateOpen) {
              setDraftFrom(dateFrom)
              setDraftTo(dateTo)
            }
            setDateOpen((o) => !o)
          }}
          aria-expanded={dateOpen}
          whileTap={{ scale: 0.96 }}
        >
          <Icon name="flow" size={14} strokeWidth={2} />
          Date filters
        </motion.button>

        {dateOpen && (
          <motion.div
            className="cl-date-panel"
            role="dialog"
            aria-label="Date filter"
            variants={menuVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="cl-date-field">
              <label htmlFor="cl-date-from">From</label>
              <input
                id="cl-date-from"
                type="date"
                value={draftFrom}
                onChange={(e) => setDraftFrom(e.target.value)}
              />
            </div>
            <div className="cl-date-field">
              <label htmlFor="cl-date-to">To</label>
              <input
                id="cl-date-to"
                type="date"
                value={draftTo}
                onChange={(e) => setDraftTo(e.target.value)}
              />
            </div>
            <div className="cl-date-footer">
              <button type="button" className="cl-date-reset" onClick={handleDateReset}>
                Reset
              </button>
              <button type="button" className="cl-date-apply" onClick={handleDateApply}>
                Apply
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Green reset / shuffle button ── */}
      <motion.button
        type="button"
        className="cl-green-btn"
        title="Reset all filters"
        aria-label="Reset all filters"
        onClick={onReset}
        whileTap={{ scale: 0.88, rotate: 15 }}
        transition={{ type: 'spring', stiffness: 400, damping: 18 }}
      >
        <Icon name="shuffle" size={16} strokeWidth={2} />
      </motion.button>
    </motion.div>
  )
}
