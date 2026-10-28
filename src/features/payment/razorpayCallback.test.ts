import { describe, expect, it } from 'vitest'
import { isPaid, readRazorpayCallback } from './razorpayCallback'

describe('readRazorpayCallback', () => {
  it('reads the values Razorpay appends to the payment link callback', () => {
    const callback = readRazorpayCallback(
      '?lead_id=SALES-1&razorpay_payment_id=pay_ABC&razorpay_payment_link_id=plink_X' +
        '&razorpay_payment_link_reference_id=ref-123&razorpay_payment_link_status=paid&razorpay_signature=sig',
    )
    expect(callback).toEqual({
      leadId: 'SALES-1',
      paymentId: 'pay_ABC',
      paymentLinkId: 'plink_X',
      referenceId: 'ref-123',
      status: 'paid',
      signature: 'sig',
    })
    expect(isPaid(callback!)).toBe(true)
  })

  it('returns null when there is no payment in the URL (e.g. after a refresh)', () => {
    expect(readRazorpayCallback('')).toBeNull()
    expect(readRazorpayCallback('?lead_id=SALES-1')).toBeNull()
  })

  it('treats any status other than paid as not paid', () => {
    const callback = readRazorpayCallback('?razorpay_payment_link_id=plink_X&razorpay_payment_link_status=cancelled')
    expect(isPaid(callback!)).toBe(false)
  })
})
