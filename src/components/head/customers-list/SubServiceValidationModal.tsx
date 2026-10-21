import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Layers,
  X,
  MailCheck,
} from 'lucide-react'

export interface SubServiceStatusItem {
  name: string
  status: string
}

export interface SubServiceValidationModalProps {
  open: boolean
  type: 'incomplete' | 'acknowledgment'
  title?: string
  message: string
  detail?: string
  subServices?: SubServiceStatusItem[]
  onClose: () => void
  onOpenSubServices?: () => void
}

export function SubServiceValidationModal({
  open,
  type,
  title,
  message,
  detail,
  subServices = [],
  onClose,
  onOpenSubServices,
}: SubServiceValidationModalProps) {
  if (!open) return null

  const isIncomplete = type === 'incomplete'
  const modalTitle = title || (isIncomplete ? 'Sub-service Incomplete' : 'Acknowledgment Pending')
  const defaultDetail = isIncomplete
    ? 'All sub-services must be completed before marking the main service as completed.'
    : 'Awaiting customer acknowledgment. The service will automatically be marked completed once the customer confirms.'

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Modal Dialog Card */}
        <motion.div
          role="dialog"
          aria-modal="true"
          className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-10"
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ type: 'spring', damping: 25, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Decorative Header Accent */}
          <div
            className={`h-1.5 w-full ${
              isIncomplete
                ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500'
                : 'bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-500'
            }`}
          />

          <div className="p-6">
            {/* Header with Icon and Close Button */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                    isIncomplete
                      ? 'bg-amber-50 text-amber-600 border border-amber-200/80'
                      : 'bg-cyan-50 text-cyan-600 border border-cyan-200/80'
                  }`}
                >
                  {isIncomplete ? (
                    <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
                  ) : (
                    <Clock className="w-6 h-6 stroke-[2.2]" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {modalTitle}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    {isIncomplete ? 'Action required before status update' : 'Waiting for confirmation'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Prominent Message Banner */}
            <div
              className={`mt-5 p-4 rounded-xl border flex items-start gap-3 ${
                isIncomplete
                  ? 'bg-amber-50/70 border-amber-200/80 text-amber-900'
                  : 'bg-cyan-50/70 border-cyan-200/80 text-cyan-950'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isIncomplete ? (
                  <div className="w-2 h-2 rounded-full bg-amber-500 ring-4 ring-amber-200 animate-pulse" />
                ) : (
                  <MailCheck className="w-4 h-4 text-cyan-600" />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold tracking-tight">{message}</p>
                <p className="text-xs leading-relaxed opacity-85">{detail || defaultDetail}</p>
              </div>
            </div>

            {/* Sub-services breakdown if available */}
            {subServices.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 px-1">
                  <span>Sub-service status:</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    {subServices.filter((s) => s.status.toUpperCase() === 'COMPLETED').length} of {subServices.length} done
                  </span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 text-xs">
                  {subServices.map((sub, idx) => {
                    const st = sub.status.toUpperCase()
                    const isDone = st === 'COMPLETED' || st === 'COMPLETE'
                    const isAck = st.includes('ACK') || st === 'PENDING_CUSTOMER_ACK'

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80 border border-slate-100"
                      >
                        <span className="font-medium text-slate-700 truncate max-w-[200px]">
                          {sub.name}
                        </span>
                        {isDone ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Done
                          </span>
                        ) : isAck ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200/60">
                            <Clock className="w-3 h-3 text-cyan-600" /> Awaiting Ack
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                            Pending
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              {onOpenSubServices && (
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onOpenSubServices()
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  View Sub-services
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className={`px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition-all cursor-pointer ${
                  isIncomplete
                    ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
                    : 'bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800'
                }`}
              >
                Got it
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  )
}
