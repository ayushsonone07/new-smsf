/** Values Razorpay appends to a payment link's callback_url after payment. */
export interface RazorpayCallback {
  leadId: string
  paymentId: string
  paymentLinkId: string
  referenceId: string
  status: string
  signature: string
}

/** Reads the callback query string; null when it holds no Razorpay payment. */
export function readRazorpayCallback(search: string): RazorpayCallback | null {
  const params = new URLSearchParams(search)
  const callback: RazorpayCallback = {
    leadId: params.get('lead_id') ?? '',
    paymentId: params.get('razorpay_payment_id') ?? '',
    paymentLinkId: params.get('razorpay_payment_link_id') ?? '',
    referenceId: params.get('razorpay_payment_link_reference_id') ?? params.get('reference_id') ?? '',
    status: params.get('razorpay_payment_link_status') ?? '',
    signature: params.get('razorpay_signature') ?? '',
  }
  return callback.paymentId || callback.paymentLinkId ? callback : null
}

/** Razorpay sends "paid" for a completed payment; a missing status is treated as paid. */
export function isPaid(callback: RazorpayCallback): boolean {
  return !callback.status || callback.status.toLowerCase() === 'paid'
}
