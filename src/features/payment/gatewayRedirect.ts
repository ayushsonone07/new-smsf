/**
 * Values SMSB appends when it redirects to /payment/success or /payment/failure after a
 * CashFree or PayU callback (CashFreeService / PayuService). SMSB has already verified and
 * recorded the payment by then, so these pages only show the result: nothing is sent back.
 */
export interface GatewayRedirect {
  gateway: 'CashFree' | 'PayU' | null
  /** Gateway order / transaction id shown to the customer. */
  orderId: string
  referenceId: string
  amount: string
  customerName: string
  /** PayU failure: the gateway's error message. CashFree / PayU success: the payment description. */
  description: string
  /** Set when SMSB could not process the callback at all (`?reason=...`). */
  reason: string
}

/** Reads a CashFree / PayU redirect; null when the query string holds neither (e.g. a Razorpay callback). */
export function readGatewayRedirect(search: string): GatewayRedirect | null {
  const params = new URLSearchParams(search)
  const value = (key: string) => (params.get(key) ?? '').trim()

  const gateway = value('cashfree_verified') ? 'CashFree' : value('payu_verified') ? 'PayU' : null
  const reason = value('reason')
  if (!gateway && !reason) return null

  return {
    gateway,
    orderId: gateway === 'PayU' ? value('payu_transaction_id') : value('order_id'),
    referenceId: value('reference_id') || value('order_id'),
    amount: value('amount'),
    customerName: value('customer_name'),
    description: value('description'),
    reason: reason === 'Error' ? '' : reason,
  }
}
