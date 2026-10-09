import type { CSSProperties, ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function Card({
  children,
  className,
  style,
}: CardProps) {
  const classes = ['content-card', className]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={classes} style={style}>
      {children}
    </section>
  )
}
