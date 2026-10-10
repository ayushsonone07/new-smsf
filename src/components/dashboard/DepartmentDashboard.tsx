import type { DepartmentDashboard } from '../../features/departments/types/dashboard.types'
import { Card } from '../ui/Card'
import { DashboardActivity } from './DashboardActivity'
import { DashboardQuickActions } from './DashboardQuickActions'
import { DashboardStats } from './DashboardStats'

interface DepartmentDashboardProps {
  departmentId: string
  dashboard: DepartmentDashboard
}

export function DepartmentDashboard({
  departmentId,
  dashboard,
}: DepartmentDashboardProps) {
  return (
    <>
      <DashboardStats stats={dashboard.stats} />

      <div className="dashboard-grid">
        <Card>
          <div className="card-section-header">
            <h2>Recent Activity</h2>

            <p>
              Latest actions across this
               department.
            </p>
          </div>

          <DashboardActivity
            activity={dashboard.activity}
          />
        </Card>

        <Card>
          <div className="card-section-header">
            <h2>Quick Actions</h2>

            <p>
              Jump to a section of this
              department.
            </p>
          </div>

          <DashboardQuickActions
            departmentId={departmentId}
          />
        </Card>
      </div>
    </>
  )
}
