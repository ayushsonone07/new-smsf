import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import {
  clearSession,
  getSession,
} from '../../app/auth/session'
import type { UserRole } from '../../features/auth/types/auth.types'
import { ProfileMenu } from '../common/ProfileMenu'
import { Icon } from '../head/shared/Icon'

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
  | '/manage-leads'
  | '/manage-customers-payment'
  | '/head'
  | '/users'

interface NavItem {
  to: NavPath
  label: string
  icon: string
  roles: UserRole[]
  isActive: (pathname: string) => boolean
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/admin/overview',
    label: 'Overview',
    icon: '📊',
    roles: ['ADMIN'],
    isActive: (pathname) => pathname.startsWith('/admin/overview'),
  },
  {
    to: '/admin',
    label: 'Departments',
    icon: '▦',
    roles: ['ADMIN'],
    isActive: (pathname) =>
      pathname === '/admin' ||
      (pathname.startsWith('/admin/departments') && !pathname.includes('/create')),
  },
  {
    to: '/admin/create-department',
    label: 'Create Department',
    icon: '➕',
    roles: ['ADMIN'],
    isActive: (pathname) =>
      pathname === '/admin/create-department' ||
      pathname === '/admin/departments/create',
  },
  {
    to: '/admin/services',
    label: 'Service List',
    icon: '🛠',
    roles: ['ADMIN'],
    isActive: (pathname) =>
      pathname.startsWith('/admin/services') ||
      pathname === '/services',
  },
  {
    to: '/admin/plans',
    label: 'Plans',
    icon: '💳',
    roles: ['ADMIN'],
    isActive: (pathname) =>
      pathname.startsWith('/admin/plans') ||
      pathname === '/plans',
  },
  {
    to: '/admin/timelines',
    label: 'Service Flow',
    icon: '🔄',
    roles: ['ADMIN'],
    isActive: (pathname) =>
      pathname.startsWith('/admin/timelines') ||
      pathname.startsWith('/admin/service-flow'),
  },
  {
    to: '/admin/customers',
    label: 'Customers',
    icon: '♙',
    roles: ['ADMIN'],
    isActive: (pathname) => pathname.startsWith('/admin/customers'),
  },
  {
    to: '/manage-leads',
    label: 'Leads',
    icon: '🏠',
    roles: ['ADMIN'],
    isActive: (pathname) => pathname.startsWith('/manage-leads') || pathname.startsWith('/leads'),
  },
  {
    to: '/manage-customers-payment',
    label: 'Payments',
    icon: '💳',
    roles: ['ADMIN'],
    isActive: (pathname) => pathname.startsWith('/manage-customers-payment') || pathname.startsWith('/admin/payments'),
  },
  {
    to: '/admin/notification-history',
    label: 'Notification History',
    icon: '🔔',
    roles: ['ADMIN'],
    isActive: (pathname) => pathname.startsWith('/admin/notification-history'),
  },
  {
    to: '/head',
    label: 'Head Panel',
    icon: '♙',
    roles: ['ADMIN', 'HEAD'],
    isActive: (pathname) =>
      pathname.startsWith('/head') || pathname.startsWith('/onboarding'),
  },
  {
    to: '/users',
    label: 'Users',
    icon: '☰',
    roles: ['ADMIN', 'HEAD', 'USER'],
    isActive: (pathname) =>
      pathname.startsWith('/users') || pathname.startsWith('/onboarding'),
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
      if (footerRef.current && !footerRef.current.contains(event.target as Node)) {
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
    (item) =>
      (role ? item.roles.includes(role) : false) &&
      // Head Panel and Users are hidden from the sidebar (UI only)
      item.to !== '/head' &&
      item.to !== '/users',
  )

  function handleLogout() {
    clearSession()
    onNavigate?.()
    navigate({ to: '/login' })
  }

  return (
    <>
      <aside className="sidebar">
      <div className="brand">
        <img className="brand-mark" src="/mbg-card-logo.svg" alt="MBG Card" />

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

      <nav className="navigation">
        <p className="nav-label">MAIN MENU</p>

        {visibleItems.map((item) => {
          const targetTo =
            (item.to === '/head' || item.to === '/users') &&
            session?.user.departmentType?.toUpperCase().includes('ONBOARDING')
              ? item.to === '/users' ? '/onboarding-user' : '/onboarding-head'
              : item.to

          return (
            <a
              key={item.to}
              href={targetTo}
              className={`nav-item ${
                item.isActive(location.pathname)
                  ? 'active'
                  : ''
              }`}
              onClick={(event) => {
                event.preventDefault()
                onNavigate?.()
                navigate({ to: targetTo as never })
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </a>
          )
        })}

        {/* HRM System — cross-router navigation (react-router-dom boundary) */}
        {role === 'ADMIN' && (
          <a
            href="/hrm/dashboard"
            className={`nav-item ${location.pathname.startsWith('/hrm') ? 'active' : ''}`}
            onClick={(event) => {
              event.preventDefault()
              onNavigate?.()
              window.location.href = '/hrm/dashboard'
            }}
          >
            <span>👥</span>
            <span>HRM System</span>
          </a>
        )}
      </nav>

      <div
        ref={footerRef}
        className="sidebar-footer-container"
        style={{ position: 'relative', marginTop: 'auto' }}
      >
        {panelOpen ? (
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
        ) : null}

        <div
          className="sidebar-footer sidebar-footer--clickable"
          role="button"
          tabIndex={0}
          title="Open profile settings"
          aria-label="Open profile settings"
          aria-expanded={panelOpen}
          onClick={() => setPanelOpen((value) => !value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
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
            className={`sidebar-footer__chevron${panelOpen ? ' is-open' : ''}`}
            aria-hidden="true"
          >
            ›
          </span>

          <button
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
    </>
  )
}
