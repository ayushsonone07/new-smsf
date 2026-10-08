import type { ReactNode } from 'react'

type BadgeVariant = 'active' | 'inactive'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

export function Badge({
  children,
  variant,
  className,
}: BadgeProps) {
  const classes = [
    'badge',
    variant ? `badge--${variant}` : null,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return <span className={classes}>{children}</span>
}
