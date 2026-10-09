import type { ReactNode } from 'react'

export type PillTone =
  | 'success'
  | 'warning'
  | 'info'
  | 'danger'
  | 'neutral'

interface PillProps {
  children: ReactNode
  tone?: PillTone
  size?: 'sm' | 'md'
  className?: string
  title?: string
}

/**
 * Small rounded label — status chips, side tags,
 * attendance pills. Purely presentational.
 */
export function Pill({
  children,
  tone = 'neutral',
  size = 'md',
  className,
  title,
}: PillProps) {
  const classes = [
    'pill',
    `pill--${tone}`,
    size === 'sm' ? 'pill--sm' : null,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={classes} title={title}>
      {children}
    </span>
  )
}
