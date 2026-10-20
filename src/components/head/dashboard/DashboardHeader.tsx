import { useState, useRef, useEffect } from 'react'
import { Icon } from '../shared/Icon'
import { useNotificationCenter } from '../layout/NotificationCenter'
import { getSession } from '../../../app/auth/session'
import { useHeadShell } from '../layout/HeadShellContext'
import { DateRangePicker } from '../customers-list/CustomersListFilters'

export interface DashboardHeaderProps {
  onRefresh?: () => void
  unreadNotifications?: number
  onToggleNotifications?: () => void
  datePeriod?: string
  onDatePeriodChange?: (period: string) => void
  customDateFrom?: string
  customDateTo?: string
  onCustomDateRangeChange?: (from: string, to: string) => void
  /** Name after "Welcome back,". */
  greetingName?: string
  /** Line under the greeting — defaults to "Showing <period> · <today>". */
  subtitle?: string
}

const PERIOD_OPTIONS = [
  'Today',
  'Last 7 days',
  'This month',
  'Custom range',
]

/**
 * Top Blue Header Banner for the Head Dashboard.
 * Displays greeting, current date/period, period selector, refresh, and notification trigger.
 */
export function DashboardHeader({
  onRefresh,
  unreadNotifications = 3,
  onToggleNotifications,
  datePeriod = 'Today',
  onDatePeriodChange,
  customDateFrom = '',
  customDateTo = '',
  onCustomDateRangeChange,
  greetingName = 'Onboarding Department',
  subtitle,
}: DashboardHeaderProps) {
  const notificationCenter = useNotificationCenter()
  const canAccessNotifications = getSession()?.user.role !== 'USER'
  const shell = useHeadShell()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showCustomRange, setShowCustomRange] = useState(false)
  const [draftFrom, setDraftFrom] = useState(customDateFrom)
  const [draftTo, setDraftTo] = useState(customDateTo)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const todayLabel = new Date().toLocaleDateString(
    'en-GB',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  )

  useEffect(() => {
    if (!dropdownOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  return (
    <div className="hdb-banner">
      <div className="hdb-banner__left">
        {shell ? (
          <button
            type="button"
            className="hdb-banner__menu"
            title="Toggle navigation"
            aria-label="Toggle navigation"
            onClick={shell.toggleSidebar}
          >
            <Icon name="menu" size={18} strokeWidth={2} />
          </button>
        ) : null}
        <div className="hdb-banner__icon-box">
          <Icon name="bar" size={22} strokeWidth={2.2} />
        </div>
        <div className="hdb-banner__text">
          <h1>Welcome back, {greetingName}</h1>
          <p>
            {subtitle ??
              `Showing ${datePeriod.toLowerCase()} · ${todayLabel}`}
          </p>
        </div>
      </div>

      <div className="hdb-banner__right">
        {/* Today Dropdown */}
        <div className="hdb-banner__dropdown" ref={dropdownRef}>
          <button
            type="button"
            className="hdb-banner__dropdown-btn"
            onClick={() => setDropdownOpen((o) => !o)}
            aria-expanded={dropdownOpen}
            aria-haspopup="listbox"
          >
            <Icon name="calendarSmall" size={14} strokeWidth={2} />
            {datePeriod}
            <Icon name="chevronDown" size={12} strokeWidth={2.5} />
          </button>

          {dropdownOpen && (
            <div className="hdb-banner__dropdown-menu" role="listbox">
              {!showCustomRange ? PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  role="option"
                  aria-selected={datePeriod === opt}
                  className={`hdb-banner__dropdown-item ${
                    datePeriod === opt ? 'is-active' : ''
                  }`}
                  onClick={() => {
                    if (opt === 'Custom range') {
                      setDraftFrom(customDateFrom)
                      setDraftTo(customDateTo)
                      setShowCustomRange(true)
                      return
                    }
                    onDatePeriodChange?.(opt)
                    setDropdownOpen(false)
                  }}
                >
                  {opt}
                </button>
              )) : (
                <div className="hdb-custom-range hdb-custom-range--calendar">
                  <button
                    type="button"
                    className="hdb-custom-range__back"
                    onClick={() => setShowCustomRange(false)}
                  >
                    <Icon name="chevronLeft" size={14} /> Date range
                  </button>
                  <DateRangePicker
                    label="Dashboard"
                    from={draftFrom}
                    to={draftTo}
                    autoOpen
                    hideTrigger
                    onChange={(from, to) => {
                      setDraftFrom(from)
                      setDraftTo(to)
                      onCustomDateRangeChange?.(from, to)
                      onDatePeriodChange?.('Custom range')
                      setShowCustomRange(false)
                      setDropdownOpen(false)
                    }}
                    onReset={() => {
                      setDraftFrom('')
                      setDraftTo('')
                    }}
                    onDismiss={() => {
                      setShowCustomRange(false)
                      setDropdownOpen(false)
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          className="hdb-banner__btn"
          title="Refresh dashboard"
          aria-label="Refresh dashboard data"
          onClick={onRefresh}
        >
          <Icon name="refresh" size={16} strokeWidth={2} />
        </button>

        {/* Bell Button */}
        {canAccessNotifications ? <div className="hdb-banner__bell-wrap">
          <button
            type="button"
            className="hdb-banner__btn"
            title="Notifications"
            aria-label="Notifications"
            onClick={onToggleNotifications ?? notificationCenter?.open}
          >
            <Icon name="bell" size={16} strokeWidth={2} />
          </button>
          {(notificationCenter?.unreadCount ?? unreadNotifications) > 0 && (
            <span className="hdb-banner__badge">
              {notificationCenter?.unreadCount ?? unreadNotifications}
            </span>
          )}
        </div> : null}
      </div>
    </div>
  )
}
