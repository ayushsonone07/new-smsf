import type { ReactNode } from 'react'

interface SectionCardProps {
  title: ReactNode
  /** Pills / counters shown next to the title. */
  meta?: ReactNode
  /** Muted text on the right. */
  hint?: ReactNode
  children: ReactNode
  className?: string
}

/** White card with a title row ("Department Users · 8 users · 6 present today"). */
export function SectionCard({
  title,
  meta,
  hint,
  children,
  className,
}: SectionCardProps) {
  return (
    <section
      className={['section-card', className]
        .filter(Boolean)
        .join(' ')}
    >
      <header className="section-card__header">
        <div className="section-card__title">
          <h2>{title}</h2>
          {meta}
        </div>

        {hint ? (
          <span className="section-card__hint">{hint}</span>
        ) : null}
      </header>

      {children}
    </section>
  )
}
