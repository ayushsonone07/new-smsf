import { useLocation, useNavigate } from '@tanstack/react-router'
import {
  clearSession,
  getSession,
} from '../../app/auth/session'
import type { UserRole } from '../../features/auth/types/auth.types'

type NavPath =
  | '/admin'
  | '/admin/tokens'
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
    to: '/admin',
    label: 'Departments',
    icon: '▦',
    roles: ['ADMIN'],
    isActive: (pathname) =>
      pathname === '/admin' ||
      pathname.startsWith('/admin/departments'),
  },
  {
    to: '/admin/tokens',
    label: 'Access Tokens',
    icon: '⚿',
    roles: ['ADMIN'],
    isActive: (pathname) =>
      pathname.startsWith('/admin/tokens'),
  },
  {
    to: '/head',
    label: 'Head Panel',
    icon: '♙',
    roles: ['ADMIN', 'HEAD'],
    isActive: (pathname) =>
      pathname.startsWith('/head'),
  },
  {
    to: '/users',
    label: 'Users',
    icon: '☰',
    roles: ['ADMIN', 'HEAD', 'USER'],
    isActive: (pathname) =>
      pathname.startsWith('/users'),
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

  const session = getSession()
  const role = session?.user.role

  const visibleItems = NAV_ITEMS.filter((item) =>
    role ? item.roles.includes(role) : false,
  )

  function handleLogout() {
    clearSession()
    onNavigate?.()
    navigate({ to: '/login' })
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">S</div>

        <div>
          <strong>SMSF</strong>
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

        {visibleItems.map((item) => (
          <a
            key={item.to}
            href={item.to}
            className={`nav-item ${
              item.isActive(location.pathname)
                ? 'active'
                : ''
            }`}
            onClick={(event) => {
              event.preventDefault()
              onNavigate?.()
              navigate({ to: item.to })
            }}
          >
            <span>{item.icon}</span>
            {item.label}
          </a>
        ))}
      </nav>

      <div className="sidebar-footer">
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

        <button
          className="logout-button"
          aria-label="Logout"
          title="Logout"
          onClick={handleLogout}
        >
          ↪
        </button>
      </div>
    </aside>
  )
}
