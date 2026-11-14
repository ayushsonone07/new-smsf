import { describe, expect, it } from 'vitest'
import { readGatewayRedirect } from './gatewayRedirect'
import { readRazorpayCallback } from './razorpayCallback'

describe('readGatewayRedirect', () => {
  it('reads a CashFree redirect', () => {
    const redirect = readGatewayRedirect(
      '?cashfree_verified=true&order_id=ORD-1&payment_id=cf_9&lead_id=L1&amount=499.00&customer_name=Asha',
    )
    expect(redirect).toMatchObject({ gateway: 'CashFree', orderId: 'ORD-1', referenceId: 'ORD-1', amount: '499.00' })
    // A CashFree redirect has no Razorpay values, so the Razorpay recorder must leave it alone.
    expect(readRazorpayCallback('?cashfree_verified=true&order_id=ORD-1&payment_id=cf_9')).toBeNull()
  })

  it('reads a PayU failure with its error message', () => {
    const redirect = readGatewayRedirect(
      '?payu_verified=true&payu_transaction_id=403993715&reference_id=REF-7&description=Bank%20declined',
    )
    expect(redirect).toMatchObject({ gateway: 'PayU', orderId: '403993715', referenceId: 'REF-7', description: 'Bank declined' })
  })

  it('reads a bare failure reason and hides the generic "Error"', () => {
    expect(readGatewayRedirect('?reason=Payment%20link%20has%20expired')?.reason).toBe('Payment link has expired')
    expect(readGatewayRedirect('?reason=Error')).toMatchObject({ gateway: null, reason: '' })
  })

  it('ignores a Razorpay callback', () => {
    expect(readGatewayRedirect('?lead_id=L1&razorpay_payment_id=pay_1')).toBeNull()
  })
})
