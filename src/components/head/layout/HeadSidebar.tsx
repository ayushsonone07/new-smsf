import { useState, useRef, useEffect } from 'react'
import { Icon } from '../shared/Icon'
import { Avatar } from '../shared/Avatar'
import { SegmentedControl } from '../shared/SegmentedControl'
import { ProfileMenu } from '../../common/ProfileMenu'
import type {
  HeadAccount,
  HeadNavItem,
  HeadRole,
} from '../../../features/departments/head/types/head.types'

interface HeadSidebarProps {
  open: boolean
  onToggle: () => void
  roleLabel: string
  items: HeadNavItem[]
  isLoading?: boolean
  loadError?: string
  onRetry?: () => void
  /** Second group shown under a "Customer-facing" heading (user role). */
  secondaryItems?: HeadNavItem[]
  activeKey: string
  onSelect: (item: HeadNavItem) => void
  account: HeadAccount
  role?: HeadRole
  onRoleChange?: (role: HeadRole) => void
  onLogout: () => void
}

/**
 * Collapsible white sidebar: brand, nav, account card
 * with Head/User switch and logout. Clicking the
 * account row expands the SMSF-style profile
 * settings menu (Profile Update, My Airtel Calls,
 * Manage Services, Salary Management).
 */
export function HeadSidebar({
  open,
  onToggle,
  roleLabel,
  items,
  isLoading = false,
  loadError,
  onRetry,
  secondaryItems = [],
  activeKey,
  onSelect,
  account,
  role,
  onRoleChange,
  onLogout,
}: HeadSidebarProps) {
  const [panelOpen, setPanelOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!panelOpen) return
    function handleClickOutside(event: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setPanelOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setPanelOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [panelOpen])

  function renderItem(item: HeadNavItem) {
    const on = item.key === activeKey

    return (
      <button
        key={item.key}
        type="button"
        className={`hnav__item${on ? ' is-on' : ''}`}
        aria-current={on ? 'page' : undefined}
        title={item.label}
        onClick={() => onSelect(item)}
      >
        <span className="hnav__bar" />
        <Icon name={item.icon} />
        {open ? <span className="hnav__label">{item.label}</span> : null}
      </button>
    )
  }

  return (
    <>
    <aside className={`hside${open ? '' : ' is-collapsed'}`}>
      <div className="hbrand">
        {open ? (
          <>
            <img className="hbrand__mark" src="/mbg-card-logo.svg" alt="MBG Card" />

            <div className="hbrand__text">
              <strong>MBG Card</strong>
              <span>{roleLabel}</span>
            </div>
          </>
        ) : null}

        <button
          type="button"
          className="hbrand__toggle"
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
          onClick={onToggle}
        >
          <Icon name="menu" />
        </button>
      </div>

      <nav className="hnav" aria-label="Main" aria-busy={isLoading}>
        {isLoading ? (
          <div className="hnav__skeletons" role="status" aria-label="Loading navigation">
            {Array.from({ length: 9 }, (_, index) => (
              <div className="hnav__skeleton" key={index}>
                <span className="hnav__skeleton-icon" />
                {open ? <span className="hnav__skeleton-label" /> : null}
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="hnav__error" role="alert">
            <span>Unable to load menu</span>
            {onRetry ? (
              <button type="button" onClick={onRetry}>
                Try again
              </button>
            ) : null}
          </div>
        ) : (
          <>
            {items.map(renderItem)}

            {secondaryItems.length > 0 ? (
              <>
                {open ? (
                  <div className="hnav__group">Customer-facing</div>
                ) : null}
                {secondaryItems.map(renderItem)}
              </>
            ) : null}
          </>
        )}
      </nav>

      {open ? (
        <div ref={accountRef} className="haccount" style={{ position: "relative" }}>
          <button
            type="button"
            className="haccount__row haccount__row--clickable"
            title="Open profile settings"
            aria-label="Open profile settings"
            aria-expanded={panelOpen}
            onClick={() => setPanelOpen((value) => !value)}
          >
            <Avatar
              name={account.initial ?? account.label}
              size={24}
              tone="brand"
            />

            <span className="haccount__text">
              <span className="haccount__name">{account.label}</span>
              <span className="haccount__role">{account.roleLabel}</span>
            </span>

            <span
              className={`haccount__chevron${panelOpen ? ' is-open' : ''}`}
              aria-hidden="true"
            >
              ›
            </span>
          </button>

          {panelOpen ? (
            <div
              className="sidebar-profile-menu-popover"
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 8px)',
                left: 0,
                right: 0,
                zIndex: 100,
                maxHeight: 'calc(100vh - 160px)',
                overflowY: 'auto',
              }}
            >
              <ProfileMenu
                onNavigate={() => setPanelOpen(false)}
              />
            </div>
          ) : null}

          {role && onRoleChange ? (
            <SegmentedControl
              fill
              size="sm"
              ariaLabel="Preview role"
              className="haccount__switch"
              value={role}
              onChange={onRoleChange}
              options={[
                { value: 'HEAD', label: 'Head' },
                { value: 'USER', label: 'User' },
              ]}
            />
          ) : null}

          <button
            type="button"
            className="haccount__logout"
            onClick={onLogout}
          >
            <Icon name="logout" size={16} />
            Log out
          </button>
        </div>
      ) : null}
    </aside>
    </>
  )
}
