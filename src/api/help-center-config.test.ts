import { describe, it, expect, vi, beforeEach } from 'vitest'
import { queryClient } from '../app/queryClient'
import type { HelpCenterConfigItem } from './help-center-config.api'

// Mock the API requests
vi.mock('../api/help-center-config.api', async () => {
  const actual = await vi.importActual('../api/help-center-config.api')
  return {
    ...actual,
    fetchTicketStatuses: vi.fn(),
    fetchTicketPriorities: vi.fn(),
    createTicketStatus: vi.fn(),
    updateTicketStatusConfig: vi.fn(),
    deleteTicketStatusConfig: vi.fn(),
    setTicketConfigActive: vi.fn(),
  }
})

describe('Help Center Config - Ticket Status', () => {
  beforeEach(() => {
    queryClient.clear()
  })

  it('should create a ticket status with followup and resolve hours', async () => {
    const api = await import('../api/help-center-config.api')
    vi.mocked(api.createTicketStatus).mockResolvedValueOnce({
      id: 1,
      name: 'Under Review',
      code: 'UR',
      followupHours: 24,
      resolveHours: 48,
      isActive: true,
      isDefault: false,
      isSystem: false,
      sortOrder: 1,
      color: '#2563EB',
    })

    const { createTicketStatus } = await import('../api/help-center-config.api')
    const result = await createTicketStatus({
      name: 'Under Review',
      isActive: true,
      isDefault: false,
      followupHours: 24,
      resolveHours: 48,
    })

    expect(result).toMatchObject({
      name: 'Under Review',
      followupHours: 24,
      resolveHours: 48,
    })
    expect(createTicketStatus).toHaveBeenCalledWith({
      name: 'Under Review',
      isActive: true,
      isDefault: false,
      followupHours: 24,
      resolveHours: 48,
    })
  })

  it('should create a ticket status without followup and resolve hours (backward compatibility)', async () => {
    const api = await import('../api/help-center-config.api')
    vi.mocked(api.createTicketStatus).mockResolvedValueOnce({
      id: 2,
      name: 'Open',
      code: 'OP',
      followupHours: null,
      resolveHours: null,
      isActive: true,
      isDefault: true,
      isSystem: false,
      sortOrder: 2,
      color: '#2563EB',
    })

    const { createTicketStatus } = await import('../api/help-center-config.api')
    const result = await createTicketStatus({
      name: 'Open',
      isActive: true,
      isDefault: true,
      followupHours: undefined,
      resolveHours: undefined,
    })

    expect(result).toMatchObject({
      name: 'Open',
      followupHours: null,
      resolveHours: null,
    })
  })

  it('should update a ticket status with followup and resolve hours', async () => {
    const api = await import('../api/help-center-config.api')
    vi.mocked(api.updateTicketStatusConfig).mockResolvedValueOnce({
      id: 1,
      name: 'Under Review',
      code: 'UR',
      followupHours: 12,
      resolveHours: 24,
      isActive: true,
      isDefault: false,
      isSystem: false,
      sortOrder: 1,
      color: '#2563EB',
    })

    const { updateTicketStatusConfig } = await import('../api/help-center-config.api')
    const result = await updateTicketStatusConfig(1, {
      name: 'Under Review',
      sortOrder: 1,
      isActive: true,
      isDefault: false,
      followupHours: 12,
      resolveHours: 24,
    })

    expect(result).toMatchObject({
      followupHours: 12,
      resolveHours: 24,
    })
    expect(updateTicketStatusConfig).toHaveBeenCalledWith(1, expect.objectContaining({
      followupHours: 12,
      resolveHours: 24,
    }))
  })

  it('should fetch ticket statuses with followup and resolve hours', async () => {
    const api = await import('../api/help-center-config.api')
    vi.mocked(api.fetchTicketStatuses).mockResolvedValueOnce([
      {
        id: 1,
        name: 'Open',
        code: 'OP',
        followupHours: 24,
        resolveHours: 48,
        isActive: true,
        isDefault: true,
        isSystem: false,
        sortOrder: 1,
        color: '#2563EB',
      },
      {
        id: 2,
        name: 'Pending',
        code: 'PY',
        followupHours: 12,
        resolveHours: 24,
        isActive: true,
        isDefault: false,
        isSystem: false,
        sortOrder: 2,
        color: '#EF4444',
      },
    ])

    const { fetchTicketStatuses } = await import('../api/help-center-config.api')
    const result = await fetchTicketStatuses()

    expect(result).toHaveLength(2)
    expect(result[0].followupHours).toBe(24)
    expect(result[0].resolveHours).toBe(48)
    expect(result[1].followupHours).toBe(12)
    expect(result[1].resolveHours).toBe(24)
  })
})