import type { ReactNode } from 'react'

interface PageLayoutProps {
  children: ReactNode
}

export function PageLayout({
  children,
}: PageLayoutProps) {
  return (
    <main className="page-content">
      {children}
    </main>
  )
}
