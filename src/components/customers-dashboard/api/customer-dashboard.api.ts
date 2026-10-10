import type {
  CreateTicketInput,
  CustomerDashboardData,
  SupportTicket,
} from '../types/customer-dashboard.types'
import { MOCK_CUSTOMER_DASHBOARD_DATA } from '../mock/customer-dashboard.mock'

/**
 * Data-access provider interface for the Customer Dashboard.
 * Currently uses mock data; replace implementation with real API calls when available.
 */

let mockDataState: CustomerDashboardData = JSON.parse(
  JSON.stringify(MOCK_CUSTOMER_DASHBOARD_DATA),
)

export async function fetchCustomerDashboardData(): Promise<CustomerDashboardData> {
  // Simulate lightweight async fetch delay
  await new Promise((resolve) => setTimeout(resolve, 50))
  return structuredClone(mockDataState)
}

export async function submitCustomerTicket(
  input: CreateTicketInput,
): Promise<SupportTicket> {
  await new Promise((resolve) => setTimeout(resolve, 100))

  const newTicketNum = `TK-${Math.floor(1000 + Math.random() * 9000)}`
  const newTicket: SupportTicket = {
    id: `tk-${Date.now()}`,
    ticketNumber: newTicketNum,
    status: 'Pending',
    priority: input.priority || 'Medium',
    timestamp: 'Just now',
    title: input.subject || 'Help Request',
    message: `You: ${input.description || 'No description provided.'}`,
    senderName: mockDataState.profile.clientName,
  }

  // Prepend to tickets list in mock state
  mockDataState.tickets = [newTicket, ...mockDataState.tickets]

  return newTicket
}

export function resetMockCustomerDashboardData(): void {
  mockDataState = JSON.parse(JSON.stringify(MOCK_CUSTOMER_DASHBOARD_DATA))
}
