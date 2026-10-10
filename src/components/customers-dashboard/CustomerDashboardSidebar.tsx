import { useNavigate } from '@tanstack/react-router'
import { Icon } from '../head/shared/Icon'
import type { IconName } from '../head/shared/iconPaths'
import { useCustomerSession } from '../../features/customers/hooks/useCustomerSession'

interface NavItem {
  key: string
  label: string
  icon: IconName
  to: string
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid', to: '/customers' },
  { key: 'my-details', label: 'My Details', icon: 'userIn', to: '/customers/details' },
]

interface CustomerDashboardSidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
  activeKey?: string
}

export function CustomerDashboardSidebar({
  collapsed,
  onToggleCollapse,
  activeKey = 'dashboard',
}: CustomerDashboardSidebarProps) {
  const navigate = useNavigate()
  const { session, logout } = useCustomerSession()

  // Dynamic customer values with fallback
  const customerName = session?.name ?? 'Hemant Dubey'
  const customerEmail = session?.email ?? 'hemantdubey.mic@gmail.com'
  const customerId = session?.customerId ?? 'cust-101'
  const initial = customerName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'HD'

  function handleNavigate(to: string) {
    navigate({ to })
  }

  function renderNavItem(item: NavItem) {
    const isActive = item.key === activeKey

    return (
      <button
        key={item.key}
        type="button"
        className={`cdb-nav-item ${isActive ? 'is-active' : ''}`}
        title={item.label}
        onClick={() => handleNavigate(item.to)}
      >
        {isActive ? <span className="cdb-nav-accent-bar" /> : null}
        <span className="cdb-nav-icon">
          <Icon name={item.icon} size={18} strokeWidth={2} />
        </span>
        {!collapsed ? (
          <span className="cdb-nav-label">{item.label}</span>
        ) : null}
      </button>
    )
  }

  return (
    <>
      {!collapsed ? (
        <div
          className="cdb-sidebar-backdrop"
          onClick={onToggleCollapse}
          role="presentation"
        />
      ) : null}

      <aside className={`cdb-sidebar ${collapsed ? 'is-collapsed' : ''}`}>
        {/* Brand Header */}
        <div className="cdb-brand">
          <div className="cdb-brand-left">
            <div className="cdb-brand-logo">
              <span>
                M<b>B</b>G
              </span>
            </div>
            {!collapsed ? (
              <div className="cdb-brand-text">
                <span className="cdb-brand-title">MBG Card</span>
                <span className="cdb-brand-subtitle">CUSTOMER PORTAL</span>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            className="cdb-brand-toggle"
            aria-label="Toggle navigation"
            onClick={onToggleCollapse}
          >
            <Icon name="menu" size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="cdb-nav">
          {NAV_ITEMS.map(renderNavItem)}
        </nav>

        {/* Account Footer with Customer ID & Logout */}
        {!collapsed ? (
          <div className="cdb-account">
            <div className="cdb-account-user">
              <div
                className="cdb-account-avatar"
                style={{ background: '#4f46e5', color: '#ffffff', borderRadius: '6px' }}
              >
                {initial}
              </div>
              <div className="cdb-account-info">
                <span className="cdb-account-email" title={customerName}>
                  {customerName}
                </span>
                <span
                  className="cdb-account-role"
                  style={{ fontSize: '11px', color: '#64748b' }}
                  title={customerEmail}
                >
                  {customerEmail}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#4f46e5',
                    marginTop: '2px',
                  }}
                >
                  ID: {customerId}
                </span>
              </div>
            </div>

            {/* Logout button */}
            <button
              type="button"
              className="cdb-logout-btn"
              onClick={logout}
              title="Log out of customer account"
            >
              <Icon name="logout" size={16} />
              <span>Log out</span>
            </button>
          </div>
        ) : null}
      </aside>
    </>
  )
}
