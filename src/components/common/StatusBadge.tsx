import type { ReactNode } from 'react'
import { Badge } from '../ui/Badge'

type StatusVariant = 'active' | 'inactive'

interface StatusBadgeProps {
  status: ReactNode
  variant: StatusVariant
}

export function StatusBadge({
  status,
  variant,
}: StatusBadgeProps) {
  return (
    <Badge variant={variant}>
      <span className="badge__dot" />

      {status}
    </Badge>
  )
}
