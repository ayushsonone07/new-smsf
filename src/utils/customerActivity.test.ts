import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CUSTOMER_ACTIVITY_EVENT,
  getCustomerActivities,
  recordCustomerActivity,
} from './customerActivity'

const STORAGE_KEY = 'smsf.customer-activity'

beforeEach(() => {
  localStorage.clear()
})

describe('recordCustomerActivity', () => {
  it('records an activity with an id and timestamp', () => {
    recordCustomerActivity({
      customerId: '42',
      contact: '9876543210',
      departmentType: 'SALES_DEPARTMENT',
      kind: 'call-initiated',
      detail: 'Called customer',
    })

    const [activity] = getCustomerActivities('42')
    expect(activity).toMatchObject({
      customerId: '42',
      contact: '9876543210',
      departmentType: 'SALES_DEPARTMENT',
      kind: 'call-initiated',
      detail: 'Called customer',
    })
    expect(activity?.id).toBeTruthy()
    expect(Number.isNaN(new Date(activity!.timestamp).getTime())).toBe(false)
  })

  it('dispatches a browser event for listeners', () => {
    const listener = vi.fn()
    window.addEventListener(CUSTOMER_ACTIVITY_EVENT, listener)

    recordCustomerActivity({
      customerId: '42',
      departmentType: 'SALES_DEPARTMENT',
      kind: 'email-sent',
      detail: 'Sent email',
    })

    expect(listener).toHaveBeenCalledTimes(1)
    window.removeEventListener(CUSTOMER_ACTIVITY_EVENT, listener)
  })

  it('keeps at most 500 activities', () => {
    const existing = Array.from({ length: 500 }, (_, index) => ({
      id: `old-${index}`,
      customerId: 'old',
      departmentType: 'SALES_DEPARTMENT',
      kind: 'email-sent',
      detail: `old ${index}`,
      timestamp: '2026-01-01T00:00:00.000Z',
    }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))

    recordCustomerActivity({
      customerId: 'new',
      departmentType: 'SALES_DEPARTMENT',
      kind: 'email-sent',
      detail: 'newest',
    })

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as unknown[]
    expect(stored).toHaveLength(500)
    expect(getCustomerActivities('new')).toHaveLength(1)
    expect(getCustomerActivities('old')).toHaveLength(499)
  })
})

describe('getCustomerActivities', () => {
  it('filters by customer id or contact', () => {
    recordCustomerActivity({
      customerId: '42',
      departmentType: 'SALES_DEPARTMENT',
      kind: 'call-initiated',
      detail: 'by id',
    })
    recordCustomerActivity({
      contact: '9876543210',
      departmentType: 'SALES_DEPARTMENT',
      kind: 'email-sent',
      detail: 'by contact',
    })

    expect(getCustomerActivities('42').map((item) => item.detail)).toEqual(['by id'])
    expect(getCustomerActivities(undefined, '9876543210').map((item) => item.detail)).toEqual([
      'by contact',
    ])
    expect(getCustomerActivities()).toEqual([])
  })

  it('returns an empty list for corrupt storage', () => {
    localStorage.setItem(STORAGE_KEY, '{not-an-array')
    expect(getCustomerActivities('42')).toEqual([])
    localStorage.setItem(STORAGE_KEY, '{"not":"an array"}')
    expect(getCustomerActivities('42')).toEqual([])
  })
})
