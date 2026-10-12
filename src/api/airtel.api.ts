import { authedApiRequest } from './client'
import { getSession } from '../app/auth/session'

export interface AirtelClickToCallResponse {
  status?: string
  message?: string
  data?: unknown
  success?: boolean
}

function sanitizePhone(raw?: string | null): string | null {
  if (!raw) return null
  const digits = String(raw).replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1)
  return /^\d{10}$/.test(digits) ? digits : null
}

export async function initiateAirtelClickToCall(
  customerPhone: string,
): Promise<AirtelClickToCallResponse> {
  const toNumber = sanitizePhone(customerPhone)
  if (!toNumber) throw new Error('Invalid customer phone number')

  const session = getSession()
  const fromNumber = sanitizePhone(
    session?.user.phoneNumber ||
      session?.user.contact ||
      sessionStorage.getItem('phoneNumber'),
  )

  if (!fromNumber) {
    throw new Error('Your agent phone number is not on file. Please contact your admin.')
  }

  return authedApiRequest<AirtelClickToCallResponse>('/v1/airtel/click-to-call', {
    method: 'POST',
    body: JSON.stringify({ fromNumber, toNumber }),
  })
}
