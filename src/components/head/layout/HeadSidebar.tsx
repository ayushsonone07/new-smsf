
import { Fragment, useState, useRef, useEffect } from 'react'

import {
  LayoutDashboard,
  UsersRound,
  UserRoundCheck,
  BriefcaseBusiness,
  History,
  Workflow,
  ChartNoAxesColumnIncreasing,
  Clock3,
  ChartColumnIncreasing,
  CircleHelp,
  Menu,
  X,
  LogOut,
  Ticket,
  BarChart3,
  Users,
  type LucideIcon,
} from 'lucide-react'

import { Avatar } from '../shared/Avatar'
import { SegmentedControl } from '../shared/SegmentedControl'
import { ProfileMenu } from '../../common/ProfileMenu'

import type {
  HeadAccount,
  HeadNavItem,
  HeadRole,
} from '../../../features/departments/head/types/head.types'

import {
  HELP_CENTER_TABS,
  canSeeHelpCenterMembers,
  isHelpSupportNavItem,
  setHelpCenterTab,
  useHelpCenterTab,
  type HelpCenterTab,
} from '../../../features/departments/head/utils/helpCenterTab'

import './HeadSidebar.css'

const HELP_TAB_ICONS: Record<HelpCenterTab, LucideIcon> = {
  'assigned-tickets': Ticket,
  analytics: BarChart3,
  'department-members': Users,
}

interface HeadSidebarProps {
  open: boolean
  onToggle: () => void
  roleLabel: string
  items: HeadNavItem[]
  isLoading?: boolean
  loadError?: string
  onRetry?: () => void
  secondaryItems?: HeadNavItem[]
  activeKey: string
  onSelect: (item: HeadNavItem) => void
  account: HeadAccount
  role?: HeadRole
  onRoleChange?: (role: HeadRole) => void
  onLogout: () => void
}

/*
 * Map dynamic menu labels to Lucide icons.
 * Existing HeadNavItem data and navigation keys
 * remain unchanged.
 */
const MENU_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  'department user': UsersRound,
  'customer list': UserRoundCheck,
  'billing list': BriefcaseBusiness,
  history: History,
  'service flow': Workflow,
  'member performance': ChartNoAxesColumnIncreasing,
  attendance: Clock3,
  analytics: ChartColumnIncreasing,
  'help & support': CircleHelp,
}

function getMenuIcon(item: HeadNavItem): LucideIcon {
  const normalizedLabel = item.label.toLowerCase().trim()

  return MENU_ICONS[normalizedLabel] ?? CircleHelp
}

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
  const helpTab = useHelpCenterTab()
  const helpTabs = HELP_CENTER_TABS.filter((t) => !t.headOnly || canSeeHelpCenterMembers())
  const accountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!panelOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (
        accountRef.current &&
        !accountRef.current.contains(event.target as Node)
      ) {
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

  function handleSelect(item: HeadNavItem) {
    setPanelOpen(false)
    onSelect(item)
  }

  function renderItem(item: HeadNavItem) {
    const active = item.key === activeKey
    const NavIcon = getMenuIcon(item)

    const button = (
      <button
        key={item.key}
        type="button"
        className={`hnav__item${active ? ' is-on' : ''}`}
        aria-current={active ? 'page' : undefined}
        title={item.label}
        onClick={() => handleSelect(item)}
      >
        <NavIcon
          className="hnav__icon"
          size={19}
          strokeWidth={1.9}
          aria-hidden="true"
        />

        <span className="hnav__label" aria-hidden={!open}>
          {item.label}
        </span>
      </button>
    )

    if (!isHelpSupportNavItem(item)) return button

    return (
      <Fragment key={item.key}>
        {button}
        <div className="hnav__sub" role="group" aria-label={`${item.label} sections`}>
          {helpTabs.map((tab) => {
            const SubIcon = HELP_TAB_ICONS[tab.key]
            const subActive = active && helpTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                className={`hnav__subitem${subActive ? ' is-on' : ''}`}
                aria-current={subActive ? 'page' : undefined}
                title={tab.label}
                onClick={() => {
                  setHelpCenterTab(tab.key)
                  handleSelect(item)
                }}
              >
                <SubIcon className="hnav__subicon" size={16} strokeWidth={1.9} aria-hidden="true" />
                <span className="hnav__label" aria-hidden={!open}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </Fragment>
    )
  }

  return (
    <aside
      className={`hside head-sidebar-v2${
        open ? '' : ' is-collapsed'
      }`}
      aria-label="Department navigation"
    >
      {/* Brand Header */}
      <div className="hbrand">
        <img
          className="hbrand__mark"
          src="/mbg-card-logo.svg"
          alt="MBG Card"
          aria-hidden={!open}
        />

        <div className="hbrand__text" aria-hidden={!open}>
          <strong>MBG Card</strong>
          <span>{roleLabel}</span>
        </div>

        <button
          type="button"
          className="hbrand__toggle"
          aria-label={open ? 'Close sidebar' : 'Open sidebar'}
          title={open ? 'Close sidebar' : 'Open sidebar'}
          aria-expanded={open}
          onClick={() => {
            setPanelOpen(false)
            onToggle()
          }}
        >
          {open ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>

      {/* Main Navigation */}
      <nav
        className="hnav"
        aria-label="Main navigation"
        aria-busy={isLoading}
      >
        <p className="hnav__heading" aria-hidden={!open}>
          MAIN MENU
        </p>

        {isLoading ? (
          <div
            className="hnav__skeletons"
            role="status"
            aria-label="Loading navigation"
          >
            {Array.from({ length: 9 }, (_, index) => (
              <div
                className="hnav__skeleton"
                key={index}
              >
                <span className="hnav__skeleton-icon" />
                <span className="hnav__skeleton-label" />
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="hnav__error" role="alert">
            <span>Unable to load menu</span>

            {onRetry && (
              <button type="button" onClick={onRetry}>
                Try again
              </button>
            )}
          </div>
        ) : (
          <>
            {items.map(renderItem)}

            {secondaryItems.length > 0 && (
              <>
                <div className="hnav__group" aria-hidden={!open}>
                  Customer-facing
                </div>

                {secondaryItems.map(renderItem)}
              </>
            )}
          </>
        )}
      </nav>

      {/* Profile Footer */}
      <div
        ref={accountRef}
        className="haccount"
        aria-hidden={!open}
        inert={!open}
        style={{ position: 'relative' }}
      >
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
              <span className="haccount__name">
                {account.label}
              </span>

              <span className="haccount__role">
                {account.roleLabel}
              </span>
            </span>

            <span
              className={`haccount__chevron${
                panelOpen ? ' is-open' : ''
              }`}
              aria-hidden="true"
            >
              ›
            </span>
          </button>

          {open && panelOpen && (
            <div
              className="sidebar-profile-menu-popover"
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 8px)',
                left: 0,
                right: 0,
                zIndex: 100,
                maxHeight: 'calc(100dvh - 160px)',
                overflowY: 'auto',
              }}
            >
              <ProfileMenu
                onNavigate={() => setPanelOpen(false)}
              />
            </div>
          )}

          {role && onRoleChange && (
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
          )}

          <button
            type="button"
            className="haccount__logout"
            onClick={onLogout}
          >
            <LogOut size={16} strokeWidth={1.9} />
            <span>Log out</span>
          </button>
      </div>
    </aside>
  )
}
