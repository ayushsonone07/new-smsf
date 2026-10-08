import type { ReactNode } from 'react'

type StatIconVariant = 'blue' | 'green' | 'gray'

interface StatCardProps {
  icon: ReactNode
  iconVariant?: StatIconVariant
  label: string
  value: ReactNode
}

export function StatCard({
  icon,
  iconVariant = 'blue',
  label,
  value,
}: StatCardProps) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${iconVariant}`}>
        {icon}
      </div>

      <div>
        <span>{label}</span>

        <strong>{value}</strong>
      </div>
    </div>
  )
}
