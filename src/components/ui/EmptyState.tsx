import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
}

export function EmptyState({
  icon,
  title,
  description,
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      {icon ? <div>{icon}</div> : null}

      <strong>{title}</strong>

      {description ? <span>{description}</span> : null}
    </div>
  )
}
