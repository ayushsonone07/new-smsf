import { useState, useRef, useEffect } from 'react'
import { Icon } from '../shared/Icon'

export interface DashboardHeaderProps {
  onRefresh?: () => void
  unreadNotifications?: number
  onToggleNotifications?: () => void
  datePeriod?: string
  onDatePeriodChange?: (period: string) => void
  /** Name after "Welcome back,". */
  greetingName?: string
  /** Line under the greeting — defaults to "Showing <period> · <today>". */
  subtitle?: string
}

const PERIOD_OPTIONS = [
  'Today',
  'Yesterday',
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
  greetingName = 'Onboarding Department',
  subtitle,
}: DashboardHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
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
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  role="option"
                  aria-selected={datePeriod === opt}
                  className={`hdb-banner__dropdown-item ${
                    datePeriod === opt ? 'is-active' : ''
                  }`}
                  onClick={() => {
                    onDatePeriodChange?.(opt)
                    setDropdownOpen(false)
                  }}
                >
                  {opt}
                </button>
              ))}
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
        <div className="hdb-banner__bell-wrap">
          <button
            type="button"
            className="hdb-banner__btn"
            title="Notifications"
            aria-label="Notifications"
            onClick={onToggleNotifications}
          >
            <Icon name="bell" size={16} strokeWidth={2} />
          </button>
          {unreadNotifications > 0 && (
            <span className="hdb-banner__badge">{unreadNotifications}</span>
          )}
        </div>
      </div>
    </div>
  )
}
