import type { Department } from '../types/department.types'

interface DepartmentStatsProps {
  departments: Department[]
}

export function DepartmentStats({
  departments,
}: DepartmentStatsProps) {
  const activeCount = departments.filter(
    (department) => department.status === 'ACTIVE',
  ).length

  const inactiveCount =
    departments.length - activeCount

  return (
    <section className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon blue">▦</div>

        <div>
          <span>Total Departments</span>
          <strong>{departments.length}</strong>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon green">✓</div>

        <div>
          <span>Active Departments</span>
          <strong>{activeCount}</strong>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon gray">◌</div>

        <div>
          <span>Inactive Departments</span>
          <strong>{inactiveCount}</strong>
        </div>
      </div>
    </section>
  )
}