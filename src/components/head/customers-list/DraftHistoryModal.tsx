import React from 'react'
import {
  Loader2,
  FileText,
  ExternalLink,
  Clock,
  User,
  MessageSquare,
  X,
} from 'lucide-react'
import type { WebsiteDraftHistoryEntry } from '../../../api/website-draft.api'

export interface DraftHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  history: WebsiteDraftHistoryEntry[]
  isLoading: boolean
  customerName: string
  customerEmail: string
}

export const DraftHistoryModal: React.FC<DraftHistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  isLoading,
  customerName,
  customerEmail,
}) => {
  const formatDate = (dateString?: string): string => {
    if (!dateString) return '—'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return dateString
      const dateStr = date.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      })
      const timeStr = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
      return `${dateStr} at ${timeStr}`
    } catch {
      return dateString
    }
  }

  const sortedHistory = [...history].sort((a, b) => {
    const tA = a.sentAt ? new Date(a.sentAt).getTime() : 0
    const tB = b.sentAt ? new Date(b.sentAt).getTime() : 0
    return tB - tA
  })

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[850px] max-h-[85vh] bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <FileText className="h-5 w-5 text-teal-600" />
              <span>Website Draft History</span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              View all website draft emails sent to {customerName} ({customerEmail})
            </p>
          </div>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="py-4 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600 mb-2" />
              <p className="text-sm text-slate-500">Loading draft history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-700 font-semibold text-sm">No draft history found</p>
              <p className="text-xs text-slate-400 mt-1">
                No website draft emails have been sent to this customer yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedHistory.map((entry, index) => (
                <div
                  key={index}
                  className="bg-slate-50 rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition-colors space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="bg-teal-100 text-teal-700 text-xs font-semibold px-2.5 py-0.5 rounded-md">
                      Draft #{index + 1}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Draft Link */}
                    <div className="flex items-start gap-2 min-w-0">
                      <ExternalLink className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 font-medium">Draft Link</p>
                        <a
                          href={entry.draftLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-teal-600 hover:text-teal-700 hover:underline break-all font-medium"
                        >
                          {entry.draftLink}
                        </a>
                      </div>
                    </div>

                    {/* Remark */}
                    <div className="flex items-start gap-2 min-w-0">
                      <MessageSquare className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 font-medium">Remark</p>
                        <p className="text-xs text-slate-700 break-words font-medium">
                          {entry.remark && entry.remark.trim() ? entry.remark : '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Sent At & Sent By */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200/70">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500">Sent At</p>
                        <p className="text-xs text-slate-700 font-semibold">
                          {formatDate(entry.sentAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500">Sent By</p>
                        <p className="text-xs text-slate-700 font-semibold">
                          {entry.sentBy || 'Unknown'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-100 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default DraftHistoryModal
