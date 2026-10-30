import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  decryptUrlParam,
  decryptUrlParams,
  encryptUrlParam,
  encryptUrlParams,
  getCustomerFormUrl,
} from './urlEncryption'
import { clearSession, setSession } from '../app/auth/session'

beforeEach(() => {
  clearSession()
})

describe('encryptUrlParam / decryptUrlParam', () => {
  it('round-trips ordinary values with the default key', () => {
    const value = '9876543210'
    expect(decryptUrlParam(encryptUrlParam(value))).toBe(value)
  })

  it('round-trips values with a custom key', () => {
    const value = 'sales-department/user@example.com'
    expect(decryptUrlParam(encryptUrlParam(value, 'my-key'), 'my-key')).toBe(value)
  })

  it('produces different cipher text for different values', () => {
    expect(encryptUrlParam('first')).not.toBe(encryptUrlParam('second'))
  })

  it('returns an empty string for empty input', () => {
    expect(encryptUrlParam('')).toBe('')
    expect(decryptUrlParam('')).toBe('')
  })

  it('returns an empty string for undecryptable input', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(decryptUrlParam('***not-base64***')).toBe('')
    errorSpy.mockRestore()
  })
})

describe('encryptUrlParams / decryptUrlParams', () => {
  it('round-trips a parameter map and drops empty values', () => {
    const encrypted = encryptUrlParams({
      contact: '9876543210',
      validation: 'token-value',
      empty: '',
    })
    const searchParams = new URLSearchParams(encrypted)

    expect(searchParams.has('empty')).toBe(false)
    expect(decryptUrlParams(searchParams)).toEqual({
      contact: '9876543210',
      validation: 'token-value',
    })
  })
})

describe('getCustomerFormUrl', () => {
  it('returns an empty string when there is no contact number', () => {
    expect(getCustomerFormUrl()).toBe('')
    expect(getCustomerFormUrl(null)).toBe('')
    expect(getCustomerFormUrl('-')).toBe('')
  })

  it('encrypts the contact and the JWT validation token', () => {
    const token = 'header.payload.signature'
    setSession({
      token,
      issuedAt: '2026-01-01T00:00:00.000Z',
      user: { id: '1', name: 'Test', email: 't@example.com', role: 'HEAD' },
    })

    const url = getCustomerFormUrl('9876543210')
    expect(url.startsWith('/customer-details?')).toBe(true)

    const params = decryptUrlParams(new URLSearchParams(url.split('?')[1]))
    expect(params.contact).toBe('9876543210')
    expect(params.validation).toBe(token)
    expect(params.isDuplicate).toBeUndefined()
  })

  it('marks duplicate customers with the isDuplicate flag', () => {
    const url = getCustomerFormUrl('9876543210', true)
    const params = decryptUrlParams(new URLSearchParams(url.split('?')[1]))
    expect(params.isDuplicate).toBe('true')
  })

  it('falls back to the customer sentinel when no JWT is available', () => {
    const url = getCustomerFormUrl('9876543210')
    const params = decryptUrlParams(new URLSearchParams(url.split('?')[1]))
    expect(params.validation).toBe('customer')
  })
})
