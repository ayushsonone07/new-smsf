import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryClient } from '../app/queryClient'
import type { SuperAdminNotification } from './superadmin-notifications.api'

const createNotificationEvent = vi.fn()
vi.mock('./notifications.api', () => ({
  createNotificationEvent: (...args: unknown[]) => createNotificationEvent(...args),
}))
vi.mock('../app/auth/session', () => ({
  getSession: () => ({ user: { name: 'Asha', departmentType: 'AUTOMATION_DEPARTMENT' } }),
}))

const { notifyServiceCompleted } = await import('./notification-factory')

function notification(id: string, audience = 'DEPARTMENT'): SuperAdminNotification {
  return {
    id,
    title: 'Automation: SOP Completed',
    message: 'Service completed',
    createdAt: '2026-11-12T10:00:00Z',
    read: false,
    kind: 'service-completed',
    audience,
  } as SuperAdminNotification
}

/** A completed service notifies the department and, separately, the customer. */
function serverReturnsStaffThenCustomerCopy() {
  createNotificationEvent
    .mockResolvedValueOnce(notification('staff'))
    .mockResolvedValueOnce(notification('customer', 'CUSTOMER'))
}

describe('notification events', () => {
  beforeEach(() => {
    queryClient.clear()
    createNotificationEvent.mockReset()
  })
  afterEach(() => vi.restoreAllMocks())

  it('adds the staff notification to the bell without reloading the list', async () => {
    queryClient.setQueryData(['notifications'], [notification('old')])
    serverReturnsStaffThenCustomerCopy()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    notifyServiceCompleted({ id: 7, businessName: 'Shop' }, 'SOP', 'AUTOMATION_DEPARTMENT')

    await vi.waitFor(() => expect(createNotificationEvent).toHaveBeenCalledTimes(2))
    await vi.waitFor(() => {
      const items = queryClient.getQueryData<SuperAdminNotification[]>(['notifications'])
      expect(items?.map((item) => item.id)).toEqual(['staff', 'old'])
    })
    expect(invalidate).not.toHaveBeenCalled()
  })

  it('leaves an unloaded list alone, so the bell loads it normally later', async () => {
    serverReturnsStaffThenCustomerCopy()

    notifyServiceCompleted({ id: 7 }, 'SOP', 'AUTOMATION_DEPARTMENT')

    await vi.waitFor(() => expect(createNotificationEvent).toHaveBeenCalledTimes(2))
    await Promise.resolve()
    expect(queryClient.getQueryData(['notifications'])).toBeUndefined()
  })
})
