import { useState, useEffect, useCallback } from 'react'
import {
  Clock,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  History,
} from 'lucide-react'
import type {
  TicketHistoryEntry,
  TicketHistoryPageResponse,
} from '../../../features/departments/types/help-center.types'
import { fetchTicketHistory } from '../../../api/help-center.api'
import { RefreshButton } from '../../ui/RefreshButton'

interface TicketStatusHistoryModalProps {
  isOpen: boolean
  ticketNumber: string
  currentStatus?: string
  onClose: () => void
}

export function TicketStatusHistoryModal({
  isOpen,
  ticketNumber,
  currentStatus,
  onClose,
}: TicketStatusHistoryModalProps) {
  const [entries, setEntries] = useState<TicketHistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrevious, setHasPrevious] = useState(false)

  const loadHistory = useCallback(
    async (targetPage = 0, size = pageSize) => {
      if (!ticketNumber) return
      setLoading(true)
      setError(null)

      try {
        const res: TicketHistoryPageResponse = await fetchTicketHistory(
          ticketNumber,
          targetPage,
          size
        )
        setEntries(res.entries || [])
        setPage(res.currentPage || 0)
        setTotalPages(res.totalPages || 0)
        setTotalRecords(res.totalRecords || (res.entries ? res.entries.length : 0))
        setHasNext(Boolean(res.hasNext))
        setHasPrevious(Boolean(res.hasPrevious))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load ticket history.')
      } finally {
        setLoading(false)
      }
    },
    [ticketNumber, pageSize]
  )

  useEffect(() => {
    if (isOpen) {
      setPage(0)
      loadHistory(0, pageSize)
    }
  }, [isOpen, loadHistory, pageSize])

  if (!isOpen) return null

  function formatDateTime(dateStr?: string | null) {
    if (!dateStr) return '—'
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
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
      return dateStr
    }
  }

  function getInitials(nameOrEmail?: string | null) {
    if (!nameOrEmail) return '?'
    const clean = nameOrEmail.trim()
    if (clean.includes('@')) {
      return clean.charAt(0).toUpperCase()
    }
    const parts = clean.split(/\s+/)
    if (parts.length > 1) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
    }
    return clean.substring(0, 2).toUpperCase()
  }

  function getStatusDotColor(status?: string) {
    switch (status?.toUpperCase()) {
      case 'OPEN':
        return 'bg-amber-500 ring-amber-100'
      case 'IN_PROGRESS':
        return 'bg-blue-500 ring-blue-100'
      case 'WAITING_ON_CUSTOMER':
        return 'bg-purple-500 ring-purple-100'
      case 'ESCALATED':
        return 'bg-rose-500 ring-rose-100'
      case 'RESOLVED':
        return 'bg-emerald-500 ring-emerald-100'
      case 'CLOSED':
        return 'bg-slate-500 ring-slate-100'
      default:
        return 'bg-slate-400 ring-slate-100'
    }
  }

  function getStatusBadgeClass(status?: string) {
    switch (status?.toUpperCase()) {
      case 'OPEN':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'WAITING_ON_CUSTOMER':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'ESCALATED':
        return 'bg-rose-100 text-rose-700 border-rose-200'
      case 'RESOLVED':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'CLOSED':
        return 'bg-slate-100 text-slate-700 border-slate-200'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  function formatStatusLabel(status?: string) {
    if (!status) return '—'
    return status
      .split('_')
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ')
  }

  const lastUpdatedAt = entries[0]?.updatedAt

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-0 shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">Status History</h3>
              <p className="text-xs font-mono font-semibold text-blue-600 mt-0.5">{ticketNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <RefreshButton
              onRefresh={() => loadHistory(page, pageSize)}
              isRefreshing={loading}
              label="status history"
            />
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 3 Summary Cards */}
        <div className="px-6 py-4 bg-slate-50/60 border-b border-slate-100 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
              Current Status
            </p>
            <p className="text-xs font-bold text-slate-900 mt-1 truncate">
              {formatStatusLabel(currentStatus)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
              Total Updates
            </p>
            <p className="text-xs font-bold text-slate-900 mt-1">
              {totalRecords} {totalRecords === 1 ? 'Update' : 'Updates'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
              Last Updated
            </p>
            <p className="text-xs font-bold text-slate-900 mt-1 truncate">
              {lastUpdatedAt ? formatDateTime(lastUpdatedAt) : '—'}
            </p>
          </div>
        </div>

        {/* Timeline Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600 mb-2" />
              <span className="text-xs font-medium">Loading ticket history…</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center text-xs text-red-700 flex items-center justify-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="font-medium text-slate-700">No status changes yet.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                This ticket has not had any status updates logged yet.
              </p>
            </div>
          ) : (
            <div className="relative pl-6">
              {/* Vertical timeline line */}
              <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-200" />

              <div className="space-y-4">
                {entries.map((entry, index) => {
                  const isLatest = index === 0
                  const dotColor = getStatusDotColor(entry.status)

                  return (
                    <div key={`${entry.updatedAt}-${entry.id ?? index}`} className="relative">
                      {/* Timeline dot */}
                      <span
                        className={`absolute -left-6 top-3 h-3 w-3 rounded-full ring-4 ${dotColor}`}
                      />

                      {/* Timeline entry card */}
                      <div
                        className={`rounded-xl border p-4 transition-all ${
                          isLatest
                            ? 'border-blue-200 bg-blue-50/40 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${getStatusBadgeClass(
                                entry.status
                              )}`}
                            >
                              {formatStatusLabel(entry.status)}
                            </span>
                            {isLatest && (
                              <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                                LATEST UPDATE
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {formatDateTime(entry.updatedAt)}
                          </span>
                        </div>

                        {entry.previousStatus && entry.previousStatus !== entry.status && (
                          <div className="text-[11px] text-slate-500 mb-2">
                            <span>Status changed from </span>
                            <span className="font-semibold text-slate-700">
                              {formatStatusLabel(entry.previousStatus)}
                            </span>
                            <span> → </span>
                            <span className="font-semibold text-slate-900">
                              {formatStatusLabel(entry.status)}
                            </span>
                          </div>
                        )}

                        {entry.remark ? (
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {entry.remark}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No remark provided.</p>
                        )}

                        <div className="mt-3 pt-2.5 border-t border-slate-100/80 flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                              {getInitials(entry.updatedBy)}
                            </span>
                            <span className="text-slate-500">
                              Updated by{' '}
                              <span className="font-semibold text-slate-700">
                                {entry.updatedBy || 'System'}
                              </span>
                            </span>
                          </div>

                          {entry.assignedTo && (
                            <span className="text-slate-500">
                              Assigned to:{' '}
                              <span className="font-medium text-slate-700">
                                {entry.assignedTo}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Pagination */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3 flex-wrap">
          {totalPages > 1 || totalRecords > pageSize ? (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-slate-500">
                Show
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const newSize = Number(e.target.value)
                    setPageSize(newSize)
                    setPage(0)
                    loadHistory(0, newSize)
                  }}
                  disabled={loading}
                  className="h-7 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {[10, 20, 50].map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!hasPrevious || loading}
                  onClick={() => loadHistory(page - 1, pageSize)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-3 w-3" /> Prev
                </button>
                <span className="text-xs text-slate-500">
                  {page + 1} / {totalPages || 1}
                </span>
                <button
                  type="button"
                  disabled={!hasNext || loading}
                  onClick={() => loadHistory(page + 1, pageSize)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          ) : (
            <span className="text-xs text-slate-400">{totalRecords} total entries</span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

