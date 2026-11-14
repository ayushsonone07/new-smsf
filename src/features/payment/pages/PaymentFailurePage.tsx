import { useEffect, useState } from 'react'
import { XCircle } from 'lucide-react'
import { readGatewayRedirect } from '../gatewayRedirect'
import { GatewayDetails } from '../components/GatewayDetails'

/**
 * Public page SMSB redirects to when a CashFree or PayU payment fails
 * ({frontend.url}payment/failure?..., set in CashFreeService / PayuService and their controllers).
 * SMSB has already marked the payment FAILED, so this page only shows the result.
 */
export function PaymentFailurePage() {
  // Read once: the query string is removed from the address bar right after.
  const [redirect] = useState(() =>
    typeof window === 'undefined' ? null : readGatewayRedirect(window.location.search),
  )

  useEffect(() => {
    // Keep the customer's name, email and phone out of the address bar and browser history.
    if (window.location.search && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const reason = redirect?.reason || (redirect?.gateway === 'PayU' ? redirect.description : '')

  return (
    <main className="min-h-screen bg-[#f4f6fb] flex items-center justify-center p-4 font-['Jost']">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center space-y-5">
        <img src="/mbg-card-logo.svg" alt="MBG Card" className="h-10 mx-auto" />

        <XCircle className="w-14 h-14 mx-auto text-red-500" aria-hidden="true" />
        <h1 className="text-xl font-bold text-slate-900">Payment failed</h1>
        <p className="text-sm text-slate-500">
          Your payment was not completed and no money was taken. You can open the payment link again to retry.
        </p>

        {reason && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {reason}
          </p>
        )}

        {redirect && <GatewayDetails redirect={redirect} />}

        <p className="text-xs text-slate-400">
          If money was deducted, it is usually returned by your bank within 5–7 working days. Share the reference
          above with your MBG Card sales contact if you need help.
        </p>
      </section>
    </main>
  )
}
