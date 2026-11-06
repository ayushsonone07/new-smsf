import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchEarlierPayments } from './register-business.api'

function respondWith(body: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  )
}

describe('fetchEarlierPayments', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('passes on why nothing was found', async () => {
    respondWith({
      success: true,
      message: 'Payment info not found for this contact',
      data: [],
    })

    await expect(fetchEarlierPayments({ phoneNumber: '9876543210' })).resolves.toEqual({
      payments: [],
      emptyMessage: 'Payment info not found for this contact',
    })
  })

  it('shows no not-found message when payments exist', async () => {
    const payment = { paymentRef: 'ref', maskedPaymentId: 'pay_****ABCD' }
    respondWith({ success: true, message: 'Earlier payments found', data: [payment] })

    await expect(fetchEarlierPayments({ customerEmail: 'a@b.com' })).resolves.toEqual({
      payments: [payment],
      emptyMessage: undefined,
    })
  })

  it('does not claim "not found" when the lookup itself fails', async () => {
    respondWith({ success: false, message: 'Server error' }, 500)

    await expect(fetchEarlierPayments({ phoneNumber: '9876543210' })).resolves.toEqual({
      payments: [],
    })
  })
})
