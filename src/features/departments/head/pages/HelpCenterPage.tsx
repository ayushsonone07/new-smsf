import { useEffect, useState } from 'react'
import { HelpCenter } from '../../../../components/head/helpCenter/HelpCenter'
import { getHelpArticles } from '../../../../api/help-center.api'
import type { HelpArticle } from '../../../../features/departments/types/help-center.types'
import { LoadingState } from '../../../../components/ui/LoadingState'
import { ErrorState } from '../../../../components/ui/ErrorState'
import { useHeadDepartmentId } from '../../../../features/departments/head/hooks/useHeadDepartmentId'

const PRIORITIES = ['high', 'medium', 'low'] as const
const STATUSES = ['unassigned', 'pending', 'in-progress', 'completed'] as const

/**
 * Help Center page for Department Head.
 * Composes the reusable HelpCenter component with live API data.
 * No outer SectionCard - the HeadShell provides the header.
 */
export function HelpCenterPage() {
  const departmentId = useHeadDepartmentId()
  const [articles, setArticles] = useState<HelpArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setIsLoading(true)
        setError(null)
        const data = await getHelpArticles(departmentId)
        if (!cancelled) setArticles(data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load articles')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [departmentId])

  if (isLoading) {
    return <LoadingState message="Loading tickets..." />
  }

  if (error) {
    return <ErrorState title="Unable to load tickets" message={error} />
  }

  // Convert HelpArticle[] to HelpCenterTicket[] format
  const tickets = articles.map((a, idx) => ({
    id: a.id,
    ticketId: `TCK-${new Date(a.updatedAt).getFullYear()}-${String(idx + 1).padStart(3, '0')}`,
    priority: PRIORITIES[idx % 3],
    status: STATUSES[idx % 4],
    subject: a.title,
    customer: 'Customer',
    company: 'Business',
    category: a.category,
    date: a.updatedAt,
    assignedTo: undefined,
    phone: undefined,
    email: undefined,
    conversation: [{ from: 'Customer', message: a.excerpt, time: new Date(a.updatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }],
  }))

  return <HelpCenter tickets={tickets} />
}