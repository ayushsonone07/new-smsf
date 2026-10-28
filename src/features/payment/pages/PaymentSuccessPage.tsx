import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, AlertTriangle, Loader2, XCircle } from 'lucide-react'
import { apiRequest } from '../../../api/client'
import { isPaid, readRazorpayCallback } from '../razorpayCallback'

/**
 * Public page Razorpay redirects to after a payment-link payment
 * (callback_url = {frontend.url}payment/success?lead_id=..., set in PaymentInfoService).
 * Razorpay appends razorpay_payment_id, razorpay_payment_link_id,
 * razorpay_payment_link_reference_id, razorpay_payment_link_status and razorpay_signature.
 * This page sends them to POST /api/payment/updatePaymentInfo, which saves payment_id and
 * the status on the payment_info row (found by lead_id + reference id).
 */

type RecordState =
  | { kind: 'recording' }
  | { kind: 'recorded' }
  | { kind: 'failed'; message: string }
  | { kind: 'not-paid' }
  | { kind: 'no-data' }

interface ApiEnvelope {
  success?: boolean
  message?: string
}

export function PaymentSuccessPage() {
  // Read once: the query string is removed from the address bar right after.
  const [callback] = useState(() =>
    typeof window === 'undefined' ? null : readRazorpayCallback(window.location.search),
  )
  // lead_id + reference id identify the payment_info row; without them nothing can be recorded.
  const canRecord = Boolean(callback?.leadId && callback.referenceId)
  const [state, setState] = useState<RecordState>(() => {
    if (!callback) return { kind: 'no-data' }
    if (!canRecord) return { kind: 'failed', message: 'the payment link details are incomplete' }
    return !isPaid(callback) ? { kind: 'not-paid' } : { kind: 'recording' }
  })
  const started = useRef(false)

  useEffect(() => {
    // Remove the Razorpay values from the URL so a refresh does not record the payment again.
    if (callback && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname)
    }
    if (!callback || !canRecord || started.current) return
    started.current = true // React StrictMode runs effects twice in dev

    apiRequest<ApiEnvelope>('/api/payment/updatePaymentInfo', {
      method: 'POST',
      body: JSON.stringify({
        leadId: callback.leadId,
        referenceId: callback.referenceId,
        paymentId: callback.paymentId || undefined,
        paymentLinkId: callback.paymentLinkId || undefined,
        // "paid" -> PAID on the backend; anything it does not know becomes PENDING
        paymentStatus: callback.status || undefined,
        razorpaySignature: callback.signature || undefined,
      }),
    })
      .then((response) => {
        if (response?.success === false) {
          setState({ kind: 'failed', message: response.message || 'The payment could not be recorded.' })
        } else if (!isPaid(callback)) {
          setState({ kind: 'not-paid' })
        } else {
          setState({ kind: 'recorded' })
        }
      })
      .catch((error: unknown) => {
        setState({
          kind: 'failed',
          message: error instanceof Error ? error.message : 'The payment could not be recorded.',
        })
      })
  }, [callback, canRecord])

  return (
    <main className="min-h-screen bg-[#f4f6fb] flex items-center justify-center p-4 font-['Jost']">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center space-y-5">
        <img src="/mbg-card-logo.svg" alt="MBG Card" className="h-10 mx-auto" />

        {state.kind === 'no-data' ? (
          <>
            <AlertTriangle className="w-14 h-14 mx-auto text-amber-500" aria-hidden="true" />
            <h1 className="text-xl font-bold text-slate-900">No payment details found</h1>
            <p className="text-sm text-slate-500">
              This page opens after a payment. If you have just paid and refreshed this page, your payment has
              already been sent to us.
            </p>
          </>
        ) : state.kind === 'not-paid' ? (
          <>
            <XCircle className="w-14 h-14 mx-auto text-red-500" aria-hidden="true" />
            <h1 className="text-xl font-bold text-slate-900">Payment not completed</h1>
            <p className="text-sm text-slate-500">
              The payment was not completed. You can open the payment link again to retry.
            </p>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-14 h-14 mx-auto text-emerald-500" aria-hidden="true" />
            <h1 className="text-xl font-bold text-slate-900">Payment successful</h1>
            <p className="text-sm text-slate-500">Thank you! Your payment to MBG Card was received.</p>
          </>
        )}

        {callback && (
          <dl className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-left text-sm space-y-2">
            {callback.paymentId && (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Payment ID</dt>
                <dd className="font-semibold text-slate-900 break-all">{callback.paymentId}</dd>
              </div>
            )}
            {callback.referenceId && (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Reference</dt>
                <dd className="font-medium text-slate-700 break-all">{callback.referenceId}</dd>
              </div>
            )}
          </dl>
        )}

        {state.kind === 'recording' && (
          <p className="flex items-center justify-center gap-2 text-sm text-slate-500" role="status">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            Recording your payment…
          </p>
        )}
        {state.kind === 'recorded' && (
          <p className="text-sm font-semibold text-emerald-700" role="status">
            Your payment has been recorded. You can close this page.
          </p>
        )}
        {state.kind === 'failed' && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800" role="alert">
            We received your payment, but could not update our records ({state.message}). Please share the
            Payment ID above with your MBG Card sales contact.
          </p>
        )}
      </section>
    </main>
  )
}
