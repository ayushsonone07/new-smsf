import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({
  children,
  className,
}: CardProps) {
  const classes = ['content-card', className]
    .filter(Boolean)
    .join(' ')

  return <section className={classes}>{children}</section>
}
