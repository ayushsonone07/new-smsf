import React from 'react'
import { X, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import type { LeadInfo } from '../../../api/leads.api'

interface DeleteLeadsModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  selectedCount: number
  isDeleting: boolean
  selectedLeadDetails?: LeadInfo | null
}

export const DeleteLeadsModal: React.FC<DeleteLeadsModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
  isDeleting,
  selectedLeadDetails,
}) => {
  if (!isOpen) return null

  const isSingle = selectedCount === 1

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onClose()
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 shadow-xs ring-4 ring-rose-50">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {isSingle ? 'Delete Lead?' : `Delete ${selectedCount} Leads?`}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                This action cannot be undone
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors hover:bg-slate-100 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-2 space-y-3.5">
          <p className="text-sm text-slate-600 leading-relaxed">
            {isSingle ? (
              <>
                Are you sure you want to permanently delete{' '}
                <strong className="text-slate-900 font-semibold">
                  {selectedLeadDetails?.ownerName || selectedLeadDetails?.businessName || 'this lead'}
                </strong>
                ?
              </>
            ) : (
              <>
                Are you sure you want to permanently delete these{' '}
                <strong className="text-slate-900 font-semibold">{selectedCount} selected leads</strong>?
              </>
            )}
          </p>

          {/* Lead Details Preview Card (if single lead) */}
          {isSingle && selectedLeadDetails && (
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-slate-700">
                <span className="text-slate-400 font-medium">Customer:</span>
                <span className="font-semibold text-slate-900">
                  {selectedLeadDetails.ownerName || selectedLeadDetails.businessName || '—'}
                </span>
              </div>
              {selectedLeadDetails.contact && (
                <div className="flex justify-between items-center text-slate-700">
                  <span className="text-slate-400 font-medium">Phone:</span>
                  <span className="font-mono text-slate-800">{selectedLeadDetails.contact}</span>
                </div>
              )}
              {selectedLeadDetails.funnelType && (
                <div className="flex justify-between items-center text-slate-700">
                  <span className="text-slate-400 font-medium">Funnel:</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                    {selectedLeadDetails.funnelType}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Warning notice */}
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              All associated follow-ups, assignments, and records for the selected{' '}
              {isSingle ? 'lead' : 'leads'} will be removed permanently.
            </span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 mt-2 bg-slate-50/70 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isSingle ? 'Delete Lead' : `Delete (${selectedCount})`}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

