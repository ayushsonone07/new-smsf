import type { GatewayRedirect } from '../gatewayRedirect'

/** The order, reference and amount from a CashFree / PayU redirect; nothing when none were sent. */
export function GatewayDetails({ redirect }: { redirect: GatewayRedirect }) {
  const rows = [
    { label: 'Gateway', value: redirect.gateway ?? '' },
    { label: 'Transaction ID', value: redirect.orderId },
    { label: 'Reference', value: redirect.referenceId !== redirect.orderId ? redirect.referenceId : '' },
    { label: 'Amount', value: redirect.amount ? `₹${redirect.amount}` : '' },
  ].filter((row) => row.value)

  if (rows.length === 0) return null

  return (
    <dl className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-left text-sm space-y-2">
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between gap-4">
          <dt className="text-slate-500">{row.label}</dt>
          <dd className="font-semibold text-slate-900 break-all">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
