import { useState } from 'react'
import { RefreshCw } from 'lucide-react'

const MIN_SPIN_MS = 600

interface RefreshButtonProps {
  /** Reloads only this section's data (e.g. a query's refetch). A returned promise keeps the icon spinning. */
  onRefresh: () => unknown
  /** Spin while the section is already fetching (e.g. query.isFetching). */
  isRefreshing?: boolean
  /** Used for the tooltip and aria-label: "Refresh {label}". */
  label?: string
  size?: number
  className?: string
}

/**
 * Small icon button that refreshes one modal / section instead of reloading the whole page.
 * It is disabled while a refresh is running so a double click does not fire two requests.
 */
export function RefreshButton({
  onRefresh,
  isRefreshing = false,
  label = 'data',
  size = 15,
  className,
}: RefreshButtonProps) {
  const [pending, setPending] = useState(false)
  const spinning = pending || isRefreshing

  async function handleClick() {
    if (spinning) return
    setPending(true)
    try {
      // Spin for at least MIN_SPIN_MS so a fast request is still visible to the user.
      await Promise.all([onRefresh(), new Promise((r) => setTimeout(r, MIN_SPIN_MS))])
    } catch (error) {
      // The section shows its own error state; do not break the button.
      console.error(`Refresh ${label} failed:`, error)
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      className={[
        'inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-1.5 text-slate-500',
        'transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600',
        'disabled:cursor-not-allowed disabled:opacity-70',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      title={spinning ? `Refreshing ${label}…` : `Refresh ${label}`}
      aria-label={`Refresh ${label}`}
      aria-busy={spinning}
      disabled={spinning}
      onClick={(event) => {
        event.stopPropagation()
        void handleClick()
      }}
    >
      <RefreshCw size={size} strokeWidth={2.2} className={spinning ? 'animate-spin' : undefined} aria-hidden="true" />
    </button>
  )
}
