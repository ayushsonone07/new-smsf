import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { fetchDepartmentTickets } from '../../../api/help-center.api'
import { AssignedTicketsView, type TicketWithAssignee } from './AssignedTicketsView'
import type { TimeRangeFilterValue } from './TimeRangeFilter'

/** Max tickets loaded at once (the table pages through them). */
const MAX_TICKETS = 200

interface AllDepartmentTicketsViewProps {
  /** Logged-in head */
  headEmail: string
  departmentType?: string
  timeFilter?: TimeRangeFilterValue
}

/**
 * Head → "All Tickets": every ticket in the department, in one table,
 * tagged with its assignee. One API call (department comes from the head's token).
 */
export function AllDepartmentTicketsView({ headEmail, departmentType, timeFilter }: AllDepartmentTicketsViewProps) {
  const [tickets, setTickets] = useState<TicketWithAssignee[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const load = useCallback(
    async (manual: boolean) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      if (manual) setIsRefreshing(true)
      else setIsLoading(true)
      setError(null)

      try {
        const page = await fetchDepartmentTickets({
          days: timeFilter?.days,
          months: timeFilter?.months,
          period: timeFilter?.period,
          startDate: timeFilter?.startDate,
          endDate: timeFilter?.endDate,
          size: MAX_TICKETS,
          signal: controller.signal,
        })
        if (controller.signal.aborted) return

        setTickets(
          page.content.map((t) => ({
            ...t,
            assigneeEmail: t.assignedToEmail,
            assigneeName: t.assignedToName,
            isUnassigned: t.unassigned ?? false,
          }))
        )
        setTotalRecords(page.totalRecords ?? page.content.length)
      } catch (err) {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Could not load department tickets')
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
          setIsRefreshing(false)
        }
      }
    },
    [timeFilter]
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount / filter change
    load(false)
    return () => abortRef.current?.abort()
  }, [load])

  if (error && tickets.length === 0) {
    return (
      <div className="rounded-2xl border border-[#e6e9f0] bg-white p-8 text-center">
        <AlertCircle className="mx-auto mb-2 h-8 w-8 text-rose-500" />
        <p className="text-sm font-semibold text-slate-900">Could not load department tickets</p>
        <p className="mt-1 text-xs text-slate-500">{error}</p>
        <button
          type="button"
          onClick={() => load(true)}
          className="mt-3 rounded-[10px] bg-[#2459e0] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1a45b8]"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {totalRecords > tickets.length && (
        <div className="flex items-start gap-2 rounded-[10px] border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            Showing the latest {tickets.length} of {totalRecords} tickets. Use the date filter above to narrow the list.
          </span>
        </div>
      )}
      <AssignedTicketsView
        tickets={tickets}
        email={headEmail}
        departmentType={departmentType}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        onRefresh={() => load(true)}
        onTicketUpdated={() => load(true)}
        canUpdateStatus={false}
        canReassignTickets
        // Round robin here would re-share tickets users already have — keep it on Assign Tickets only
        showRoundRobin={false}
        canCall={false}
        showAssignee
        emptyText="No tickets in your department yet."
      />
    </div>
  )
}
