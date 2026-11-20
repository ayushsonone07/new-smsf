
import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'

import {
  clearSession,
  getSession,
} from '../../app/auth/session'

import type { UserRole } from '../../features/auth/types/auth.types'
import { ProfileMenu } from '../common/ProfileMenu'
import { Icon } from '../head/shared/Icon'

import {
  LayoutDashboard,
  Building2,
  ListChecks,
  CreditCard,
  Workflow,
  UsersRound,
  Target,
  Wallet,
  Bell,
  CalendarCheck,
  LifeBuoy,
  Mail,
  ChevronDown,
  CircleDot,
  Flag,
  BarChart3,
  type LucideIcon,
} from 'lucide-react'

import './AdminSidebar.css'

type NavPath =
  | '/admin'
  | '/admin/overview'
  | '/admin/create-department'
  | '/admin/customers'
  | '/admin/services'
  | '/admin/plans'
  | '/admin/timelines'
  | '/admin/service-flow'
  | '/admin/notification-history'
  | '/admin/bulk-email'
  | '/admin/help-support'
  | '/admin/help-support/analytics'
  | '/admin/help-support/departments'
  | '/admin/help-support/status'
  | '/admin/help-support/priority'
  | '/manage-leads'
  | '/manage-customers-payment'
  | '/head'
  | '/users'

interface NavItem {
  to: NavPath
  label: string
  icon: LucideIcon
  roles: UserRole[]
  isActive: (pathname: string) => boolean
  badge?: number
  children?: Array<{ to: NavPath; label: string; icon: LucideIcon }>
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/admin/overview',
    label: 'Overview',
    icon: LayoutDashboard,
    roles: ['ADMIN'],
    isActive: (pathname) =>
      pathname.startsWith('/admin/overview'),
  },
  {
    to: '/admin',
    label: 'Departments',
    icon: Building2,
    roles: ['ADMIN'],
    isActive: (pathname) =>
      pathname === '/admin' ||
      pathname.startsWith('/admin/departments') ||
      pathname === '/admin/create-department',
  },
  {
    to: '/admin/services',
    label: 'Service List',
    icon: ListChecks,
    roles: ['ADMIN'],
    isActive: (pathname) =>
      pathname.startsWith('/admin/services') ||
      pathname === '/services',
  },
  {
    to: '/admin/plans',
    label: 'Plans',
    icon: CreditCard,
    roles: ['ADMIN'],
    isActive: (pathname) =>
      pathname.startsWith('/admin/plans') ||
      pathname === '/plans',
  },
  {
    to: '/admin/timelines',
    label: 'Services & SOP',
    icon: Workflow,
    roles: ['ADMIN'],
    isActive: (pathname) =>
      pathname.startsWith('/admin/timelines') ||
      pathname.startsWith('/admin/service-flow'),
  },
  {
    to: '/admin/customers',
    label: 'Customers',
    icon: UsersRound,
    roles: ['ADMIN'],
    isActive: (pathname) =>
      pathname.startsWith('/admin/customers'),
  },
  {
    to: '/manage-leads',
    label: 'Leads',
    icon: Target,
    roles: ['ADMIN'],
    isActive: (pathname) =>
      pathname.startsWith('/manage-leads') ||
      pathname.startsWith('/leads'),
  },
  {
    to: '/manage-customers-payment',
    label: 'Payments',
    icon: Wallet,
    roles: ['ADMIN'],
    isActive: (pathname) =>
      pathname.startsWith('/manage-customers-payment') ||
      pathname.startsWith('/admin/payments'),
  },
  {
    to: '/admin/help-support/departments',
    label: 'Help & Support',
    icon: LifeBuoy,
    roles: ['ADMIN'],
    isActive: (pathname) =>
      pathname.startsWith('/admin/help-support'),
    children: [
      { to: '/admin/help-support/departments', label: 'All Departments', icon: Building2 },
      { to: '/admin/help-support/status', label: 'Status', icon: CircleDot },
      { to: '/admin/help-support/priority', label: 'Priority', icon: Flag },
    ],
  },
  {
    to: '/admin/notification-history',
    label: 'Notification History',
    icon: Bell,
    roles: ['ADMIN'],
    isActive: (pathname) =>
      pathname.startsWith('/admin/notification-history'),
  },
  {
    to: '/admin/bulk-email',
    label: 'Bulk Email',
    icon: Mail,
    roles: ['ADMIN'],
    isActive: (pathname) => pathname.startsWith('/admin/bulk-email'),
  },
]

interface AdminSidebarProps {
  onNavigate?: () => void
  onClose?: () => void
}

export function AdminSidebar({
  onNavigate,
  onClose,
}: AdminSidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const [panelOpen, setPanelOpen] = useState(false)
  const [helpSupportOpen, setHelpSupportOpen] = useState(
    location.pathname.startsWith('/admin/help-support'),
  )
  const footerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!panelOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (
        footerRef.current &&
        !footerRef.current.contains(event.target as Node)
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

  const session = getSession()
  const role = session?.user.role

  const visibleItems = NAV_ITEMS.filter(
    (item) => role ? item.roles.includes(role) : false
  )

  function handleLogout() {
    clearSession()
    onNavigate?.()
    navigate({ to: '/login' })
  }

  function handleNavigation(to: NavPath) {
    setPanelOpen(false)
    onNavigate?.()
    navigate({ to })
  }

  return (
    <aside className="sidebar admin-sidebar-v2">

      {/* Brand Header */}
      <div className="brand">
        <img
          className="brand-mark"
          src="/mbg-card-logo.svg"
          alt="MBG Card"
        />

        <div>
          <strong>MBG Card</strong>
          <span>Admin Portal</span>
        </div>

        <button
          type="button"
          className="sidebar-close"
          aria-label="Close sidebar"
          title="Close sidebar"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      {/* Navigation Menu */}
      <nav
        className="navigation"
        aria-label="Admin navigation"
      >
        <p className="nav-label">MAIN MENU</p>

        {visibleItems.map((item) => {
          const NavIcon = item.icon
          const active = item.isActive(location.pathname)

          if (item.children) {
            const expanded = helpSupportOpen || active
            return (
              <div className="nav-group" key={item.label}>
                <button
                  type="button"
                  className={`nav-item nav-item--parent ${active ? 'active' : ''}`}
                  aria-expanded={expanded}
                  onClick={() => setHelpSupportOpen((value) => !value)}
                >
                  <NavIcon className="nav-item-icon" size={16} strokeWidth={1.9} aria-hidden="true" />
                  <span className="nav-item-label">{item.label}</span>
                  <ChevronDown className={`nav-item-chevron ${expanded ? 'is-open' : ''}`} size={14} aria-hidden="true" />
                </button>
                {expanded && (
                  <div className="nav-submenu">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon
                      const childActive = location.pathname === child.to
                      return (
                        <a
                          key={child.to}
                          href={child.to}
                          className={`nav-subitem ${childActive ? 'active' : ''}`}
                          aria-current={childActive ? 'page' : undefined}
                          onClick={(event) => {
                            event.preventDefault()
                            handleNavigation(child.to)
                          }}
                        >
                          <ChildIcon size={13} strokeWidth={2} aria-hidden="true" />
                          <span>{child.label}</span>
                        </a>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          return (
            <a
              key={item.to}
              href={item.to}
              aria-current={active ? 'page' : undefined}
              className={`nav-item ${active ? 'active' : ''}`}
              onClick={(event) => {
                event.preventDefault()
                handleNavigation(item.to)
              }}
            >
              <NavIcon
                className="nav-item-icon"
                size={16}
                strokeWidth={1.9}
                aria-hidden="true"
              />

              <span className="nav-item-label">
                {item.label}
              </span>

              {item.badge !== undefined &&
                item.badge > 0 && (
                  <span className="nav-item-badge">
                    {item.badge}
                  </span>
                )}
            </a>
          )
        })}

        {/* HRM System uses cross-router navigation */}
        {role === 'ADMIN' && (
          <a
            href="/hrm/dashboard"
            className={`nav-item ${
              location.pathname.startsWith('/hrm')
                ? 'active'
                : ''
            }`}
            aria-current={
              location.pathname.startsWith('/hrm')
                ? 'page'
                : undefined
            }
            onClick={(event) => {
              event.preventDefault()
              setPanelOpen(false)
              onNavigate?.()
              window.location.href = '/hrm/dashboard'
            }}
          >
            <CalendarCheck
              className="nav-item-icon"
              size={19}
              strokeWidth={1.9}
              aria-hidden="true"
            />

            <span className="nav-item-label">
              HRM System
            </span>
          </a>
        )}
      </nav>

      {/* Profile Footer */}
      <div
        ref={footerRef}
        className="sidebar-footer-container"
        style={{
          position: 'relative',
          marginTop: 'auto',
        }}
      >
        {panelOpen && (
          <div
            className="sidebar-profile-menu-popover"
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 4px)',
              left: '2px',
              right: '2px',
              zIndex: 100,
              maxHeight: 'calc(100vh - 140px)',
              overflowY: 'auto',
            }}
          >
            <ProfileMenu
              variant="light"
              onNavigate={() => {
                setPanelOpen(false)
                onNavigate?.()
              }}
            />
          </div>
        )}

        <div
          className="sidebar-footer sidebar-footer--clickable"
          role="button"
          tabIndex={0}
          title="Open profile settings"
          aria-label="Open profile settings"
          aria-expanded={panelOpen}
          onClick={() => setPanelOpen((value) => !value)}
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' ||
              event.key === ' '
            ) {
              event.preventDefault()
              setPanelOpen((value) => !value)
            }
          }}
        >
          <div className="admin-avatar">
            {role === 'HEAD'
              ? 'H'
              : role === 'USER'
                ? 'U'
                : 'A'}
          </div>

          <div className="admin-info">
            <strong>
              {session?.user.name ?? 'Signed out'}
            </strong>
            <span>{role ?? '—'}</span>
          </div>

          <span
            className={`sidebar-footer__chevron${
              panelOpen ? ' is-open' : ''
            }`}
            aria-hidden="true"
          >
            ›
          </span>

          <button
            type="button"
            className="logout-button"
            aria-label="Logout"
            title="Logout"
            onClick={(event) => {
              event.stopPropagation()
              handleLogout()
            }}
          >
            <Icon name="logout" size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}
