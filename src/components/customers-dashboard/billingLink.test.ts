import { describe, expect, it } from 'vitest'
import { encryptUrlParams } from '../../utils/urlEncryption'
import { readBillingLink } from './billingLink'

describe('readBillingLink', () => {
  it('reads the business id and phone from a billing email link', () => {
    const search = `?${encryptUrlParams({ customerId: '205', contact: '9876543210', validation: 'customer' })}`
    expect(readBillingLink(search)).toEqual({ customerId: 205, contact: '9876543210' })
  })

  it('works with only the phone (old links)', () => {
    const search = `?${encryptUrlParams({ contact: '9876543210', validation: 'customer' })}`
    expect(readBillingLink(search)).toEqual({ contact: '9876543210' })
  })

  it('returns null when the page is opened from the dashboard', () => {
    expect(readBillingLink('')).toBeNull()
    expect(readBillingLink('?tab=invoices')).toBeNull()
  })

  it('ignores a business id that is not a number', () => {
    const search = `?${encryptUrlParams({ customerId: 'abc', validation: 'customer' })}`
    expect(readBillingLink(search)).toBeNull()
  })
})
