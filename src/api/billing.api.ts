import { authedApiRequest } from './client'

export interface BillingCustomer {
  id: number
  ownerName?: string
  businessName?: string
  phoneNumber?: string
  email?: string
  address?: string
  billingAddress?: string
  gstNumber?: string | null
  informationStatus?: string | null
  billStatus?: string
  generatedBillInfo?: string | Record<string, unknown> | null
  lastUpdated?: string
  createdAt?: string
  status?: string
  amountPending?: string | number
  amountPaid?: string | number
  paymentLinkSS?: string | null
  [key: string]: unknown
}

interface BillingPageResponse {
  success?: boolean
  message?: string
  data?: BillingCustomer[] | { content?: BillingCustomer[]; customers?: BillingCustomer[] }
  content?: BillingCustomer[]
  customers?: BillingCustomer[]
}

interface ApiEnvelope<T> {
  success?: boolean
  message?: string
  data?: T
}

export async function getBillingCustomers(size = 100): Promise<BillingCustomer[]> {
  const response = await authedApiRequest<BillingPageResponse>(
    `/api/billing/customers?page=0&size=${size}`,
  )
  if (Array.isArray(response.data)) return response.data
  if (Array.isArray(response.data?.content)) return response.data.content
  if (Array.isArray(response.data?.customers)) return response.data.customers
  if (Array.isArray(response.content)) return response.content
  if (Array.isArray(response.customers)) return response.customers
  return []
}

export async function uploadCustomerBill(customerId: number, file: File) {
  const body = new FormData()
  body.append('file', file)
  return authedApiRequest<ApiEnvelope<unknown>>(
    `/api/billing/customers/${customerId}/bill/upload`,
    { method: 'POST', body },
  )
}

export interface BillingInvoiceUpdate {
  invoiceNo: string
  invoiceDate?: string
  invoiceAmount?: string
  status: string
  billingLink?: string
}

export async function updateBillingInvoice(
  customerId: number,
  input: BillingInvoiceUpdate,
): Promise<BillingCustomer | null> {
  const response = await authedApiRequest<ApiEnvelope<BillingCustomer>>(
    `/api/billing/customers/${customerId}/invoice`,
    { method: 'PUT', body: JSON.stringify(input) },
  )
  return response.data ?? null
}
