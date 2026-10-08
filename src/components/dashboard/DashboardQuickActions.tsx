import { Link } from '@tanstack/react-router'

interface DashboardQuickActionsProps {
  departmentId: string
}

export function DashboardQuickActions({
  departmentId,
}: DashboardQuickActionsProps) {
  return (
    <div className="quick-actions">
      <Link
        to="/departments/$departmentId/customers"
        params={{ departmentId }}
        className="quick-action-card"
      >
        <div className="quick-action-icon">
          ♙
        </div>

        <strong>Customers</strong>

        <span>Manage customer accounts</span>
      </Link>

      <Link
        to="/departments/$departmentId/services"
        params={{ departmentId }}
        className="quick-action-card"
      >
        <div className="quick-action-icon">
          ▦
        </div>

        <strong>Services</strong>

        <span>Browse department services</span>
      </Link>

      <Link
        to="/departments/$departmentId/help-center"
        params={{ departmentId }}
        className="quick-action-card"
      >
        <div className="quick-action-icon">
          ?
        </div>

        <strong>Help Center</strong>

        <span>Guides and articles</span>
      </Link>

      <Link
        to="/admin/departments/$departmentId"
        params={{ departmentId }}
        className="quick-action-card"
      >
        <div className="quick-action-icon">
          ⚙
        </div>

        <strong>Permissions</strong>

        <span>Configure feature access</span>
      </Link>
    </div>
  )
}
