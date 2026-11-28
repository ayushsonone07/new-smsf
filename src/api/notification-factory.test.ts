import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { queryClient } from '../app/queryClient'
import { notifyTicketSLAExceeded } from './notification-factory'

// Mock createNotificationEvent to track calls
const createNotificationEvent = vi.fn().mockResolvedValue({
  id: 'test-notification-id',
  title: 'Test',
  message: 'Test message',
  createdAt: '2026-11-12T10:00:00Z',
  read: false,
  kind: 'ticket-sla-breach' as const,
  audience: 'DEPARTMENT' as const,
})

vi.mock('./notifications.api', () => ({
  createNotificationEvent: (...args: unknown[]) => createNotificationEvent(...args),
}))

vi.mock('../app/auth/session', () => ({
  getSession: () => ({
    user: { name: 'Asha', departmentType: 'AUTOMATION_DEPARTMENT' },
  }),
}))

describe('Ticket SLA Breach Notifications', () => {
  beforeEach(() => {
    queryClient.clear()
    createNotificationEvent.mockReset()
  })

  afterEach(() => vi.restoreAllMocks())

  it('should call createNotificationEvent with ticket-sla-breach kind when resolve time exceeded', () => {
    notifyTicketSLAExceeded('TICKET-001', 'Open', 'resolve')
    
    // Test runs synchronously - createNotificationEvent is called within emitScoped
    // The void pattern means the promise is created but not awaited in the function
    // We just verify the function was called with correct args
    expect(createNotificationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'ticket-sla-breach',
      })
    )
  })

  it('should call createNotificationEvent with ticket-sla-breach kind when followup time exceeded', () => {
    notifyTicketSLAExceeded('TICKET-002', 'Pending', 'followup')
    
    expect(createNotificationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'ticket-sla-breach',
      })
    )
  })

  it('should include department type in the scope when provided', () => {
    notifyTicketSLAExceeded('TICKET-003', 'Open', 'resolve', 'CUSTOMER_DEPARTMENT')
    
    expect(createNotificationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        departmentType: 'CUSTOMER_DEPARTMENT',
      })
    )
  })

  it('should use default department type when not specified', () => {
    notifyTicketSLAExceeded('TICKET-004', 'Open', 'followup')
    
    expect(createNotificationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        departmentType: 'AUTOMATION_DEPARTMENT',
      })
    )
  })
})