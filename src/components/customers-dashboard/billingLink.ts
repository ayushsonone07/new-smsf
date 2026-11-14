import { decryptUrlParams } from '../../utils/urlEncryption'

/**
 * The business a billing email link is for. SMSB sends
 * `/customer-billing?customerId=…&contact=…&validation=customer` (UtilityMethods.generateBillingLink),
 * each value encrypted like the customer details link.
 */
export interface BillingLink {
  customerId?: number
  contact?: string
}

/** Reads the business from the billing link; null when the page was opened without one (e.g. from the dashboard). */
export function readBillingLink(search: string): BillingLink | null {
  const params = new URLSearchParams(search)
  if (!params.has('customerId') && !params.has('contact')) return null

  const decrypted = decryptUrlParams(params)
  const id = Number((decrypted.customerId || '').trim())
  const contact = (decrypted.contact || '').trim()

  const link: BillingLink = {
    ...(Number.isInteger(id) && id > 0 ? { customerId: id } : {}),
    ...(contact ? { contact } : {}),
  }
  return link.customerId || link.contact ? link : null
}
