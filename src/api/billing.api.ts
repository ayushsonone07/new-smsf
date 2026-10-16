import { ApiError, authedApiRequest } from './client'

/** Backend `BillingStatus` enum. */
export type BillStatus = 'PENDING' | 'IN_PROGRESS' | 'GENERATED'

/** Backend `BillingInformationStatus` enum. */
export type BillingInformationStatus = 'PENDING' | 'PROVIDED'

export interface BillingCustomer {
  id: number
  ownerName?: string
  businessName?: string
  phoneNumber?: string
  email?: string
  address?: string
  billingAddress?: string
  gstNumber?: string | null
  informationStatus?: BillingInformationStatus | string | null
  billStatus?: BillStatus | string | null
  generatedBillInfo?: string | Record<string, unknown> | null
  lastUpdated?: string
  createdAt?: string
  status?: string
  amountPending?: string | number
  amountPaid?: string | number
  paymentLinkSS?: string | null
  [key: string]: unknown
}

/** `GET /api/billing/customers` page envelope (backend `CustomPageResponse`). */
export interface BillingPageResponse {
  success?: boolean
  message?: string
  data?: BillingCustomer[] | { content?: BillingCustomer[]; customers?: BillingCustomer[] }
  content?: BillingCustomer[]
  customers?: BillingCustomer[]
  pageNumber?: number
  elementSize?: number
  totalElements?: number
  totalPage?: number
  isFirst?: boolean
  isLast?: boolean
  summary?: unknown
}

export interface BillingCustomerQuery {
  page?: number
  size?: number
  searchParam?: string
}

export interface ApiEnvelope<T> {
  success?: boolean
  message?: string
  data?: T
}

/** Billing snapshot rendered by the customer drawer. */
export interface BillingInformation {
  informationStatus: BillingInformationStatus
  informationStatusLabel: string
  billStatus: BillStatus
  billStatusLabel: string
  isGenerated: boolean
  billUrl: string
}

/** Editable invoice fields stored inside the billing details JSON. */
export interface BillingInvoiceDetails {
  invoiceNo: string
  invoiceDate: string
  invoiceAmount: string
  status: BillStatus
  billingLink: string
}

const BILL_URL_KEYS = ['generatedBillInfo', 'billingLink', 'billUrl'] as const

function buildBillingCustomersQuery(query: BillingCustomerQuery): string {
  const params = new URLSearchParams()
  params.set('page', String(query.page ?? 0))
  params.set('size', String(query.size ?? 10))
  const search = query.searchParam?.trim()
  if (search) params.set('searchParam', search)
  return params.toString()
}

export function extractBillingCustomers(
  response: BillingPageResponse | null | undefined,
): BillingCustomer[] {
  if (!response) return []
  if (Array.isArray(response.data)) return response.data
  if (Array.isArray(response.data?.content)) return response.data.content
  if (Array.isArray(response.data?.customers)) return response.data.customers
  if (Array.isArray(response.content)) return response.content
  if (Array.isArray(response.customers)) return response.customers
  return []
}

/** Raw paginated billing fetch. Bearer token + session username headers are attached. */
export async function fetchBillingCustomers(
  query: BillingCustomerQuery = {},
): Promise<BillingPageResponse> {
  const response = await authedApiRequest<BillingPageResponse>(
    `/api/billing/customers?${buildBillingCustomersQuery(query)}`,
  )
  if (response?.success === false) {
    throw new ApiError(
      response.message || 'Failed to fetch billing customers',
      0,
    )
  }
  return response ?? {}
}

/** Convenience wrapper returning only the customer list of the requested page. */
export async function getBillingCustomers(
  sizeOrQuery: number | BillingCustomerQuery = 100,
): Promise<BillingCustomer[]> {
  const query: BillingCustomerQuery =
    typeof sizeOrQuery === 'number'
      ? { page: 0, size: sizeOrQuery }
      : { page: 0, size: 10, ...sizeOrQuery }
  const response = await fetchBillingCustomers(query)
  return extractBillingCustomers(response)
}

/** `POST /api/billing/customers/{customerId}/bill/upload` with multipart `file`. */
export async function uploadCustomerBill(
  customerId: number,
  file: File,
): Promise<ApiEnvelope<unknown>> {
  const body = new FormData()
  body.append('file', file)
  const response = await authedApiRequest<ApiEnvelope<unknown>>(
    `/api/billing/customers/${customerId}/bill/upload`,
    { method: 'POST', body },
  )
  if (response && response.success === false) {
    throw new ApiError(response.message || 'Failed to upload bill', 0)
  }
  return response ?? {}
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {}
}

function parseGeneratedBillInfo(
  raw: BillingCustomer['generatedBillInfo'],
): Record<string, unknown> {
  if (raw && typeof raw === 'object') return raw
  if (typeof raw !== 'string' || !raw.trim()) return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

function asHttpUrl(value: unknown): string {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  return /^https?:\/\//i.test(trimmed) ? trimmed : ''
}

function firstUrlFrom(record: Record<string, unknown>): string {
  for (const key of BILL_URL_KEYS) {
    const url = asHttpUrl(record[key])
    if (url) return url
  }
  return ''
}

/**
 * Resolves the stored bill URL. Reads the SMSF `generatedBillInfo`,
 * `billingLink` and `billUrl` fields from the serialized billing details
 * (and from the customer record itself), plus a plain URL string.
 * Returns an empty string when no usable URL is stored.
 */
export function getBillUrl(customer?: BillingCustomer | null): string {
  if (!customer) return ''

  const raw = customer.generatedBillInfo
  if (typeof raw === 'string') {
    const direct = asHttpUrl(raw)
    if (direct) return direct
    const nested = firstUrlFrom(parseGeneratedBillInfo(raw))
    if (nested) return nested
  } else {
    const nested = firstUrlFrom(asRecord(raw))
    if (nested) return nested
  }

  return firstUrlFrom(customer as unknown as Record<string, unknown>)
}

export function normalizeBillStatus(value?: BillStatus | string | null): BillStatus {
  const normalized = String(value ?? '').trim().toUpperCase()
  if (normalized === 'GENERATED') return 'GENERATED'
  if (normalized === 'IN_PROGRESS') return 'IN_PROGRESS'
  return 'PENDING'
}

export function normalizeInformationStatus(
  value?: BillingInformationStatus | string | null,
): BillingInformationStatus {
  return String(value ?? '').trim().toUpperCase() === 'PROVIDED'
    ? 'PROVIDED'
    : 'PENDING'
}

const BILL_STATUS_LABELS: Record<BillStatus, string> = {
  GENERATED: 'Generated',
  IN_PROGRESS: 'In progress',
  PENDING: 'Pending',
}

const INFORMATION_STATUS_LABELS: Record<BillingInformationStatus, string> = {
  PROVIDED: 'Provided',
  PENDING: 'Pending',
}

/** Billing information snapshot used by the drawer's Bill Upload tab. */
export function getBillingInformation(
  customer?: BillingCustomer | null,
): BillingInformation {
  const billStatus = normalizeBillStatus(customer?.billStatus)
  const informationStatus = normalizeInformationStatus(
    customer?.informationStatus,
  )
  return {
    billStatus,
    billStatusLabel: BILL_STATUS_LABELS[billStatus],
    isGenerated: billStatus === 'GENERATED',
    informationStatus,
    informationStatusLabel: INFORMATION_STATUS_LABELS[informationStatus],
    billUrl: getBillUrl(customer),
  }
}

export interface BillingInvoiceUpdate {
  invoiceNo: string
  invoiceDate?: string
  invoiceAmount?: string
  status: string
  billingLink?: string
}

function pickText(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key]
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value)
    }
  }
  return ''
}

/**
 * Reads the editable invoice fields out of the customer's serialized billing
 * details (`generatedBillInfo`), falling back to top-level DTO fields.
 */
export function getBillingInvoice(
  customer?: BillingCustomer | null,
): BillingInvoiceDetails {
  if (!customer) {
    return {
      invoiceNo: '',
      invoiceDate: '',
      invoiceAmount: '',
      status: 'PENDING',
      billingLink: '',
    }
  }

  const details =
    typeof customer.generatedBillInfo === 'string'
      ? parseGeneratedBillInfo(customer.generatedBillInfo)
      : asRecord(customer.generatedBillInfo)

  const status = normalizeBillStatus(
    (details.status as string | undefined) ?? customer.billStatus,
  )

  return {
    invoiceNo: pickText(details, ['invoiceNo', 'invoiceNumber', 'billId']),
    invoiceDate: pickText(details, ['invoiceDate', 'date', 'generatedAt']),
    invoiceAmount: pickText(details, ['invoiceAmount', 'amount']),
    status,
    billingLink: getBillUrl(customer) || pickText(details, BILL_URL_KEYS.slice()),
  }
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
