import { authedApiRequest } from './client'

export type PaymentStatus = 'CREATED' | 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'ALL'

export interface PaymentInfoItem {
  paymentsInfoId: string
  leadId: string
  referenceId: string
  paymentId?: string
  paymentLinkId?: string
  razorpaySignature?: string
  amount: number
  customerName: string
  customerEmail: string
  customerPhone: string
  description?: string
  paymentStatus: string
  createdAt?: string
  paymentLink?: string
  linkExpireAt?: string
  paidAt?: string
  cancelledAt?: string
  paymentReference?: string
  metaData?: Record<string, unknown>
}

export interface PaymentFetchResponse {
  totalPayments: number
  totalCreated: number
  totalPaid: number
  totalPending: number
  totalExpired: number
  payments: PaymentInfoItem[]
  pageNumber: number
  pageSize: number
  totalElements: number
  totalPages: number
}

export interface FetchPaymentsParams {
  search?: string
  searchParam?: string
  status?: string
  page?: number
  pageSize?: number
}

/**
 * Fetches paginated payment history from GET /api/payment/fetch.
 * Supports both search and searchParam query aliases.
 */
export async function fetchPayments(
  params: FetchPaymentsParams = {},
): Promise<PaymentFetchResponse> {
  const query = new URLSearchParams()
  const searchVal = params.searchParam ?? params.search ?? ''
  if (searchVal) {
    query.set('search', searchVal)
    query.set('searchParam', searchVal)
  }
  query.set('status', params.status ?? 'all')
  query.set('page', String(params.page ?? 0))
  query.set('pageSize', String(params.pageSize ?? 10))

  const res = await authedApiRequest<{
    data?: PaymentFetchResponse
    status?: string
    message?: string
    success?: boolean
  }>(`/api/payment/fetch?${query.toString()}`)

  if (res?.data) {
    return res.data
  }

  // Handle case where response directly returns PaymentResponseDTO
  return (res as unknown as PaymentFetchResponse) ?? {
    totalPayments: 0,
    totalCreated: 0,
    totalPaid: 0,
    totalPending: 0,
    totalExpired: 0,
    payments: [],
    pageNumber: 0,
    pageSize: 10,
    totalElements: 0,
    totalPages: 0,
  }
}

