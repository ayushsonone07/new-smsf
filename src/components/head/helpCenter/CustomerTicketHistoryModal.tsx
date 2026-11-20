import { useState, useEffect, useCallback } from 'react'
import {
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Layers,
  Calendar,
  Building2,
  User,
  Clock,
  Ticket as TicketIcon,
} from 'lucide-react'
import type {
  CustomerHistoryPageResponse,
  CustomerHistoryTicket,
  TicketPriority,
  TicketStatus,
} from '../../../features/departments/types/help-center.types'
import { fetchCustomerTicketHistory } from '../../../api/help-center.api'
import { RefreshButton } from '../../ui/RefreshButton'
import { TicketAttachmentsView } from '../../customers-dashboard/TicketAttachmentsView'

interface CustomerTicketHistoryModalProps {
  isOpen: boolean
  customer: {
    creatorId: number
    creatorName?: string | null
    creatorEmail?: string | null
    creatorPhone?: string | null
    currentTicketNumber?: string
  } | null
  onClose: () => void
}

function getStatusBadgeClass(status?: TicketStatus | string | null) {
  switch (status) {
    case 'OPEN':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'IN_PROGRESS':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'WAITING_ON_CUSTOMER':
      return 'bg-purple-50 text-purple-700 border-purple-200'
    case 'ESCALATED':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    case 'RESOLVED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'CLOSED':
      return 'bg-slate-100 text-slate-700 border-slate-200'
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200'
  }
}

function getPriorityBadgeClass(priority?: TicketPriority | string | null) {
  switch (priority) {
    case 'CRITICAL':
      return 'bg-red-50 text-red-700 border-red-200'
    case 'HIGH':
      return 'bg-orange-50 text-orange-700 border-orange-200'
    case 'MEDIUM':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'LOW':
      return 'bg-slate-100 text-slate-600 border-slate-200'
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200'
  }
}

function formatStatus(status?: string | null) {
  if (!status) return 'Unknown'
  return status
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ')
}

function formatPriority(priority?: string | null) {
  if (!priority) return 'Normal'
  return priority.charAt(0) + priority.slice(1).toLowerCase()
}

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '—'
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
      .format(d)
      .toLowerCase()
  } catch {
    return '—'
  }
}

export function CustomerTicketHistoryModal({
  isOpen,
  customer,
  onClose,
}: CustomerTicketHistoryModalProps) {
  const [tickets, setTickets] = useState<CustomerHistoryTicket[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [pageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrevious, setHasPrevious] = useState(false)
  const [scope, setScope] = useState<string[]>([])

  const loadHistory = useCallback(
    async (targetPage = 0) => {
      if (!customer?.creatorId) return
      setLoading(true)
      setError(null)

      try {
        const res: CustomerHistoryPageResponse = await fetchCustomerTicketHistory(
          customer.creatorId,
          {
            excludeTicket: customer.currentTicketNumber,
            page: targetPage,
            size: pageSize,
          }
        )
        setTickets(res.content || [])
        setPage(res.currentPage || 0)
        setTotalPages(res.totalPages || 0)
        setTotalRecords(res.totalRecords || (res.content ? res.content.length : 0))
        setHasNext(Boolean(res.hasNext))
        setHasPrevious(Boolean(res.hasPrevious))
        setScope(res.scope || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load customer ticket history.')
      } finally {
        setLoading(false)
      }
    },
    [customer?.creatorId, customer?.currentTicketNumber, pageSize]
  )

  useEffect(() => {
    if (isOpen && customer?.creatorId) {
      setPage(0)
      loadHistory(0)
    }
  }, [isOpen, customer?.creatorId, loadHistory])

  if (!isOpen || !customer) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <Layers className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 truncate">
                  Customer Ticket History
                </h3>
                {totalRecords > 0 && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {totalRecords} previous {totalRecords === 1 ? 'ticket' : 'tickets'}
                  </span>
                )}
                {scope.length > 0 && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    Scope: {scope.join(', ')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {[customer.creatorName, customer.creatorPhone, customer.creatorEmail]
                  .filter(Boolean)
                  .join(' · ') || 'Customer'}
                {customer.currentTicketNumber && (
                  <span className="text-slate-400"> (excluding {customer.currentTicketNumber})</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <RefreshButton
              onRefresh={() => loadHistory(page)}
              isRefreshing={loading}
              label="customer history"
            />
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading && tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
              <p className="text-sm font-medium">Fetching customer ticket history…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <AlertCircle className="h-10 w-10 text-rose-500 mb-2" />
              <p className="text-sm font-semibold text-slate-800 mb-1">Failed to load history</p>
              <p className="text-xs text-slate-500 max-w-md mb-4">{error}</p>
              <button
                type="button"
                onClick={() => loadHistory(page)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-center">
              <TicketIcon className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No Other Tickets Found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                This customer does not have any other tickets in the accessible department scope.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => (
                <div
                  key={t.ticketNumber}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-slate-300 transition-all space-y-2.5"
                >
                  {/* Top line: ticket number, badges, date */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50/60 px-2 py-0.5 rounded border border-blue-100">
                        {t.ticketNumber}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getPriorityBadgeClass(
                          t.priority
                        )}`}
                      >
                        {formatPriority(t.priority)}
                      </span>
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${getStatusBadgeClass(
                          t.status
                        )}`}
                      >
                        {formatStatus(t.status)}
                      </span>
                      {t.departmentName && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          {t.departmentName}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateTime(t.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Subject */}
                  <h4 className="text-sm font-bold text-slate-900 leading-snug">
                    {t.subject || 'No Subject'}
                  </h4>

                  {/* Business & Assigned info */}
                  {(t.businessName || t.assignedTo || t.assignedToName) && (
                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      {t.businessName && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-slate-400" />
                          <span>Business: <strong className="text-slate-700">{t.businessName}</strong></span>
                        </span>
                      )}
                      {(t.assignedToName || t.assignedTo) && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3 text-slate-400" />
                          <span>Assigned: <span className="font-medium text-slate-700">{t.assignedToName || t.assignedTo}</span></span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Description snippet */}
                  {t.description && (
                    <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {t.description}
                    </div>
                  )}

                  {/* Attachments with Download button only */}
                  {t.attachments && t.attachments.length > 0 && (
                    <div className="pt-1">
                      <TicketAttachmentsView attachments={t.attachments} />
                    </div>
                  )}

                  {/* Resolved at timestamp if available */}
                  {t.resolvedAt && (
                    <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                      <Clock className="h-3 w-3" />
                      <span>Resolved on {formatDateTime(t.resolvedAt)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer / Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/50">
            <span className="text-xs text-slate-500">
              Page <span className="font-semibold text-slate-700">{page + 1}</span> of{' '}
              <span className="font-semibold text-slate-700">{totalPages}</span> ({totalRecords} total)
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadHistory(page - 1)}
                disabled={!hasPrevious || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </button>
              <button
                type="button"
                onClick={() => loadHistory(page + 1)}
                disabled={!hasNext || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
