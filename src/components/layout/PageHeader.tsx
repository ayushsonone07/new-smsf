import type { ReactNode } from 'react'

interface PageHeaderProps {
  breadcrumb?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}

export function PageHeader({
  breadcrumb,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <header className="topbar">
      <div>
        {breadcrumb ? (
          <p className="breadcrumb">{breadcrumb}</p>
        ) : null}

        <h1>{title}</h1>

        {description ? (
          <p className="page-description">
            {description}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div className="topbar-actions">
          {actions}
        </div>
      ) : null}
    </header>
  )
}
