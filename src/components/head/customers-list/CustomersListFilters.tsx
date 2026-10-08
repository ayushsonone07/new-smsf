import { useState, useRef, useEffect, type ReactNode } from 'react'
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
    <div className="cl-controls">

      {/* ── Status tabs ── */}
      <div className="cl-tabs" role="tablist" aria-label="Filter by onboarding status">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`cl-tab${activeTab === tab.key ? ' is-active' : ''}`}
            onClick={() => onTabChange(tab.key)}
          >
            {tab.label}
            <span className="cl-tab__count">{countFor(tab.key)}</span>
          </button>
        ))}
      </div>

      {/* ── Search (injected from parent) ── */}
      {searchSlot}

      {/* ── Assignee dropdown ── */}
      <div className="cl-assignee-wrap" ref={assigneeRef}>
        <button
          type="button"
          className="cl-assignee-btn"
          onClick={() => setAssigneeOpen((o) => !o)}
          aria-expanded={assigneeOpen}
          aria-haspopup="listbox"
        >
          {assigneeLabel}
          <Icon name="chevronDown" size={14} strokeWidth={2.5} />
        </button>

        {assigneeOpen && (
          <div className="cl-assignee-menu" role="listbox" aria-label="Filter by assignee">
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
          </div>
        )}
      </div>

      {/* ── Date filter ── */}
      <div className="cl-date-wrap" ref={dateRef}>
        <button
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
        >
          <Icon name="flow" size={14} strokeWidth={2} />
          Date filters
        </button>

        {dateOpen && (
          <div className="cl-date-panel" role="dialog" aria-label="Date filter">
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
          </div>
        )}
      </div>

      {/* ── Green reset / shuffle button ── */}
      <button
        type="button"
        className="cl-green-btn"
        title="Reset all filters"
        aria-label="Reset all filters"
        onClick={onReset}
      >
        <Icon name="shuffle" size={16} strokeWidth={2} />
      </button>
    </div>
  )
}
