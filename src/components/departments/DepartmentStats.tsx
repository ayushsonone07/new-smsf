import type { Department } from '../../features/departments/types/department.types'
import { StatCard } from '../common/StatCard'

interface DepartmentStatsProps {
  departments: Department[]
}

export function DepartmentStats({
  departments,
}: DepartmentStatsProps) {
  const activeCount = departments.filter(
    (department) =>
      department.status === 'ACTIVE',
  ).length

  const inactiveCount =
    departments.length - activeCount

  return (
    <section className="stats-grid">
      <StatCard
        icon="▦"
        iconVariant="blue"
        label="Total Departments"
        value={departments.length}
      />

      <StatCard
        icon="✓"
        iconVariant="green"
        label="Active Departments"
        value={activeCount}
      />

      <StatCard
        icon="◌"
        iconVariant="gray"
        label="Inactive Departments"
        value={inactiveCount}
      />
    </section>
  )
}
