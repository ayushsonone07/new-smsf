
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
  CirclePlus,
  ListChecks,
  CreditCard,
  Workflow,
  UsersRound,
  Target,
  Wallet,
  Bell,
  CalendarCheck,
  LifeBuoy,
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
  | '/admin/help-support'
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
      (pathname.startsWith('/admin/departments') &&
        !pathname.includes('/create')),
  },
  {
    to: '/admin/create-department',
    label: 'Create Department',
    icon: CirclePlus,
    roles: ['ADMIN'],
    isActive: (pathname) =>
      pathname === '/admin/create-department' ||
      pathname === '/admin/departments/create',
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
    to: '/admin/help-support',
    label: 'Help & Support',
    icon: LifeBuoy,
    roles: ['ADMIN'],
    isActive: (pathname) =>
      pathname.startsWith('/admin/help-support'),
  },
  {
    to: '/admin/notification-history',
    label: 'Notification History',
    icon: Bell,
    roles: ['ADMIN'],
    isActive: (pathname) =>
      pathname.startsWith('/admin/notification-history'),
    badge: 4,
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
                size={19}
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
