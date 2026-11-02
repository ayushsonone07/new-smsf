import { apiRequest } from './client'
import { getSession } from '../app/auth/session'
import type {
  CustomerRegistrationRequest,
  PlanAmount,
  PlanWithDepartments,
  RegisteredCustomer,
} from '../features/customers/types/register-business.types'

/** Backend envelope: { status, message, data, success }. */
interface CustomApiResponse<T> {
  success?: boolean
  message?: string
  data?: T | null
}

export interface PaymentInfoRecord {
  paymentReference?: string | null
  createdAt?: string | null
  customerPhone?: string | null
  customerEmail?: string | null
  amount?: number | null
  paymentId?: string | null
  paymentsInfoId?: string | null
  paymentInfo?: Record<string, unknown> | null
}

export interface GstinDetails {
  gstin?: string | null
  legal_name?: string | null
  trade_name?: string | null
  status?: string | null
  taxpayer_type?: string | null
  business_constitution?: string | null
  registration_date?: string | null
  cancellation_date?: string | null
  state_code?: string | null
  state_jurisdiction?: string | null
  address?: string | null
  pincode?: string | null
  nature_of_business?: string[] | null
}

interface PlansWithDepartmentsEnvelope {
  success?: boolean
  message?: string
  /** plan name -> department types */
  data?: Record<string, string[]>
}

/**
 * Public plan list grouped by department. Mirrors the homepage form:
 * `GET /api/auth/departments/plans` -> { "<plan name>": ["<dept>", ...] }.
 */
export async function fetchPlansWithDepartments(): Promise<
  PlanWithDepartments[]
> {
  const response = await apiRequest<PlansWithDepartmentsEnvelope>(
    '/api/auth/departments/plans',
  )

  if (!response.success || !response.data) {
    throw new Error(
      response.message || 'Failed to fetch plans with departments',
    )
  }

  return Object.entries(response.data).map(
    ([name, departments], index) => ({
      id: `plan-${index + 1}`,
      name,
      description: `Complete business solution with ${departments.length} department${
        departments.length > 1 ? 's' : ''
      }`,
      departments,
    }),
  )
}

/** Public amount + duration of every plan. `GET /api/plan/amounts`. */
export async function fetchPlanAmounts(): Promise<PlanAmount[]> {
  const response = await apiRequest<CustomApiResponse<PlanAmount[]>>(
    '/api/plan/amounts',
  )

  return response.data ?? []
}

/** Fetches payment records used to attribute a registration to its seller. */
export async function fetchPaymentInfo(
  customerEmail: string,
): Promise<PaymentInfoRecord[]> {
  const session = getSession()
  const headers: Record<string, string> = {}

  if (session?.token) headers.Authorization = `Bearer ${session.token}`
  if (session?.user.email || session?.user.username) {
    headers.username = session.user.email || session.user.username || ''
  }

  const response = await apiRequest<CustomApiResponse<PaymentInfoRecord[]>>(
    `/api/payment/info?customerEmail=${encodeURIComponent(customerEmail.trim())}`,
    { headers },
  )

  return response.data ?? []
}

export async function fetchGstinDetails(gstin: string): Promise<GstinDetails> {
  const response = await apiRequest<CustomApiResponse<GstinDetails>>(
    `/api/gstin/${encodeURIComponent(gstin.trim().toUpperCase())}`,
  )

  if (!response.success || !response.data) {
    throw new Error(response.message || 'Unable to verify this GSTIN')
  }

  return response.data
}

export interface VerifyPaymentResult {
  success: boolean
  message?: string
  data?: VerifiedPayment
}

/**
 * Verifies a payment ID against a phone number and returns what is left of it.
 * `POST /api/payment/verify`. A fully used payment fails, with its usage in `data`.
 */
export async function verifyPayment(
  phoneNumber: string,
  paymentId: string,
  options?: {
    /** Encrypted reference from {@link fetchEarlierPayments}, sent instead of the ID. */
    paymentRef?: string
  },
): Promise<VerifyPaymentResult> {
  const response = await apiRequest<CustomApiResponse<VerifiedPayment>>(
    '/api/payment/verify',
    {
      method: 'POST',
      body: JSON.stringify(
        options?.paymentRef
          ? { phoneNumber, paymentRef: options.paymentRef }
          : { phoneNumber, paymentId },
      ),
    },
  )

  return {
    success: Boolean(response.success),
    message: response.message,
    data: response.data ?? undefined,
  }
}

/** An earlier payment from a phone number; its real ID is never sent to the browser. */
export interface EarlierPayment {
  /** Encrypted, phone-bound reference accepted by verify and register. */
  paymentRef: string
  /** e.g. "pay_****XyZ1". */
  maskedPaymentId: string
  /** Rupees. */
  amount?: number | null
  used?: number | null
  available?: number | null
  paidAt?: string | null
}

/**
 * Earlier payments made from a phone number, with what is left on each — so a new
 * business can be registered without knowing the old payment ID.
 * `POST /api/payment/customer-payments` (public; IDs are masked).
 */
export async function fetchEarlierPayments(
  phoneNumber: string,
): Promise<EarlierPayment[]> {
  const response = await apiRequest<CustomApiResponse<EarlierPayment[]>>(
    '/api/payment/customer-payments',
    {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    },
  )
  return response.data ?? []
}

/**
 * Registers a customer. `POST /api/auth/customers/register`.
 *
 * The endpoint is public, but when someone is already signed in we forward
 * their identity so the backend can attribute the registration.
 */
export async function registerCustomer(
  payload: CustomerRegistrationRequest,
): Promise<void> {
  const session = getSession()
  const headers: Record<string, string> = {}

  const username = session?.user.email || session?.user.username
  if (username) headers.username = username
  if (session?.token) headers.Authorization = `Bearer ${session.token}`

  const response = await apiRequest<CustomApiResponse<unknown>>(
    '/api/auth/customers/register',
    {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    },
  )

  if (response.success === false) {
    throw new Error(response.message || 'Failed to register customer.')
  }
}

/**
 * Uploads the payment screenshot to Cloudflare (folder payment_ss) and saves
 * its URL on the customer — the same two public endpoints the onboarding
 * billing form uses. Returns the uploaded file's URL.
 */
export async function uploadPaymentScreenshot(
  file: File,
  customer: RegisteredCustomer,
  billingAddress: string,
): Promise<string> {
  const body = new FormData()
  body.append('file', file)

  const upload = await apiRequest<CustomApiResponse<{ url?: string }>>(
    '/api/files/upload?folder=payment_ss',
    { method: 'POST', body },
  )

  const url = upload.data?.url
  if (!upload.success || !url || !url.trim()) {
    throw new Error(
      upload.message || 'Upload succeeded but no URL was returned.',
    )
  }

  const save = await apiRequest<CustomApiResponse<unknown>>(
    '/api/common/customerDetails/save',
    {
      method: 'POST',
      body: JSON.stringify({
        phone: customer.phone,
        email: customer.email,
        businessName: customer.businessName,
        ownerName: customer.ownerName,
        ...(billingAddress.trim()
          ? { billingAddress: billingAddress.trim() }
          : {}),
        ...(customer.gstNumber ? { gstNumber: customer.gstNumber } : {}),
        paymentLinkSS: url,
      }),
    },
  )

  if (save.success === false) {
    throw new Error(
      save.message ||
        'Screenshot uploaded but could not be saved to the customer.',
    )
  }

  return url
}
