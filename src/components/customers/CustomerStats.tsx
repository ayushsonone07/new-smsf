import type { Customer } from '../../features/departments/types/customer.types'
import { StatCard } from '../common/StatCard'

interface CustomerStatsProps {
  customers: Customer[]
}

export function CustomerStats({
  customers,
}: CustomerStatsProps) {
  const activeCount = customers.filter(
    (customer) =>
      customer.status === 'ACTIVE',
  ).length

  const inactiveCount =
    customers.length - activeCount

  return (
    <section className="stats-grid">
      <StatCard
        icon="♙"
        iconVariant="blue"
        label="Total Customers"
        value={customers.length}
      />

      <StatCard
        icon="✓"
        iconVariant="green"
        label="Active Customers"
        value={activeCount}
      />

      <StatCard
        icon="◌"
        iconVariant="gray"
        label="Inactive Customers"
        value={inactiveCount}
      />
    </section>
  )
}
