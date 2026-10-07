import type { DepartmentDashboardStats } from '../../features/departments/types/dashboard.types'
import { StatCard } from '../common/StatCard'

interface DashboardStatsProps {
  stats: DepartmentDashboardStats
}

export function DashboardStats({
  stats,
}: DashboardStatsProps) {
  return (
    <section className="stats-grid">
      <StatCard
        icon="♙"
        iconVariant="blue"
        label="Total Customers"
        value={stats.totalCustomers}
      />

      <StatCard
        icon="✓"
        iconVariant="green"
        label="Active Customers"
        value={stats.activeCustomers}
      />

      <StatCard
        icon="♢"
        iconVariant="blue"
        label="Open Tickets"
        value={stats.openTickets}
      />

      <StatCard
        icon="▦"
        iconVariant="gray"
        label="Active Services"
        value={stats.activeServices}
      />
    </section>
  )
}
