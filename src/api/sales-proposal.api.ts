import { apiRequest } from './client'

export interface SalesPackage {
  key: string
  label: string
}

export interface SalesProposalPayload {
  packageKey: string
  ownerName: string
  businessName?: string
  customerEmail: string
  customerPhone: string
  salesName: string
  designation?: string
  salesPhone: string
  salesEmail?: string
  ccType: 'cc' | 'bcc'
  amount: number | null
  paymentLink?: string
  secretKey?: string
}

interface ApiResponse<T> { success?: boolean; message?: string; data?: T }

async function salesRequest<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
  return apiRequest<ApiResponse<T>>(`/api/sales${path}`, body === undefined ? {} : {
    method: 'POST', body: JSON.stringify(body),
  })
}

export async function getSalesPackages(): Promise<SalesPackage[]> {
  const result = await salesRequest<SalesPackage[]>('/packages')
  return result.data ?? []
}

export async function previewSalesProposal(payload: SalesProposalPayload): Promise<string> {
  const result = await salesRequest<string>('/preview', payload)
  if (!result.success || !result.data) throw new Error(result.message || 'Preview unavailable')
  return result.data
}

export async function verifySalesKey(secretKey: string): Promise<void> {
  const result = await salesRequest<string>('/verify-key', { secretKey })
  if (!result.success) throw new Error(result.message || 'Invalid secret key')
}

export async function generateSalesPaymentLink(payload: SalesProposalPayload): Promise<string> {
  const result = await salesRequest<string>('/payment-link', payload)
  if (!result.success || !result.data) throw new Error(result.message || 'Could not generate payment link')
  return result.data
}

export async function sendSalesProposal(payload: SalesProposalPayload): Promise<string> {
  const result = await salesRequest<string>('/send-proposal', payload)
  if (!result.success) throw new Error(result.message || 'Could not send proposal')
  return result.message || 'Proposal sent successfully'
}
