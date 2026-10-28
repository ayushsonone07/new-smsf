import { useEffect, useRef, useState } from 'react'
import { Modal } from '../../../../components/ui/Modal'
import { RefreshButton } from '../../../../components/ui/RefreshButton'
import {
  getServiceDeliveryHistory,
  type ServiceDeliveryHistory,
} from '../../../../api/department-users.api'
import {
  PackageCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Loader2,
  AlertCircle,
} from 'lucide-react'

interface ServiceDeliveryHistoryModalProps {
  open: boolean
  onClose: () => void
  customerId: number | string | null
  customerName: string
  onHistoryLoaded?: (
    customerId: string,
    completionPercentage: number | null,
    isDelivered: boolean,
  ) => void
}

const FIELD_LABELS: Record<string, string> = {
  invoice: 'Invoice',
  profileLink: 'Profile Link (Google Business)',
  positiveReviewQr: 'Positive Review QR (Link)',
  positiveReviewQrUsername: 'Review QR Username',
  positiveReviewQrPassword: 'Review QR Password',
  googlePerformanceDashboard: 'Google Performance Dashboard',
  creativeBundle: '365 Creative Bundle',
  aiVideo: 'AI Video',
  website: 'Website',
  automationDashboard: 'Automation Dashboard',
  automationLoginId: 'Automation Login ID',
  monthlyBlogPromotion: 'Monthly Blog Promotion',
}

const isLink = (val: string) => /^https?:\/\//i.test(val.trim())

export function ServiceDeliveryHistoryModal({
  open,
  onClose,
  customerId,
  customerName,
  onHistoryLoaded,
}: ServiceDeliveryHistoryModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<ServiceDeliveryHistory | null>(null)
  // Bumped by the refresh button to re-run only this modal's history load.
  const [reloadKey, setReloadKey] = useState(0)

  const onHistoryLoadedRef = useRef(onHistoryLoaded)
  onHistoryLoadedRef.current = onHistoryLoaded

  useEffect(() => {
    if (!open || !customerId) return

    let cancelled = false
    setLoading(true)
    setError(null)
    setHistory(null)

    getServiceDeliveryHistory(customerId)
      .then((data) => {
        if (cancelled) return
        setHistory(data)
        const emailSent = Boolean(data?.isSent?.email)
        const whatsappSent = Boolean(data?.isSent?.whatsapp)
        const isDelivered = emailSent || whatsappSent
        const pct = typeof data?.completionPercentage === 'number' ? data.completionPercentage : null
        onHistoryLoadedRef.current?.(String(customerId), pct, isDelivered)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load delivery history')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, customerId, reloadKey])

  const emailSent = Boolean(history?.isSent?.email)
  const whatsappSent = Boolean(history?.isSent?.whatsapp)
  const completionPct =
    typeof history?.completionPercentage === 'number' ? history.completionPercentage : null
  const data = history?.Data ?? null
  const dataEntries = data
    ? Object.entries(data).filter(([, val]) => val !== null && val !== undefined && String(val).trim() !== '')
    : []

  const formatDate = (val?: string) => {
    if (!val) return '—'
    const parsed = new Date(val)
    return isNaN(parsed.getTime()) ? val : parsed.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      className="delivery-conf-modal"
    >
      <div className="delivery-conf-container">
        {/* Header */}
        <div className="delivery-conf-header">
          <div className="delivery-conf-header-title">
            <PackageCheck className="w-5 h-5 text-emerald-600" />
            <h2>Service Delivered</h2>
            <RefreshButton
              className="ml-auto"
              onRefresh={() => setReloadKey((key) => key + 1)}
              isRefreshing={loading}
              label="delivery history"
            />
          </div>
          <p className="delivery-conf-header-sub">
            Last delivery details sent to <strong>{customerName}</strong>
          </p>
        </div>

        {/* Content */}
        <div className="delivery-conf-body">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-sm">Loading delivery history...</span>
            </div>
          ) : error ? (
            <div className="delivery-conf-error-alert" role="alert">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          ) : !history ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No service delivery has been sent to this customer yet.
            </div>
          ) : (
            <>
              {/* Summary Badges Bar */}
              <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    emailSent
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {emailSent ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                  Email {emailSent ? 'sent' : 'not sent'}
                </span>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    whatsappSent
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {whatsappSent ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                  WhatsApp {whatsappSent ? 'sent' : 'not sent'}
                </span>

                {completionPct !== null && (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      completionPct >= 80
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : completionPct >= 40
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {completionPct}% Complete
                  </span>
                )}

                <div className="ml-auto inline-flex items-center gap-1 text-xs text-slate-500">
                  <Clock size={13} />
                  <span>{formatDate(history.updatedAt)}</span>
                </div>
              </div>

              {/* Data Entries */}
              {dataEntries.length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-500">
                  No link details were stored for this delivery.
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {dataEntries.map(([key, val]) => (
                    <div
                      key={key}
                      className="p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors"
                    >
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {FIELD_LABELS[key] ?? key}
                      </div>
                      {isLink(String(val)) ? (
                        <a
                          href={String(val)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 break-all font-medium"
                        >
                          <ExternalLink size={13} className="shrink-0" />
                          <span>{String(val)}</span>
                        </a>
                      ) : (
                        <div className="mt-1 text-sm text-slate-800 font-medium break-all">
                          {String(val)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="delivery-conf-footer">
          <button
            type="button"
            className="delivery-conf-btn-cancel"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}

