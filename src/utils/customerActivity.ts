export type CustomerActivityKind = 'call-initiated' | 'email-sent'

export interface CustomerActivityEvent {
  id: string
  customerId?: string
  contact?: string
  departmentType: string
  kind: CustomerActivityKind
  detail: string
  timestamp: string
}

const STORAGE_KEY = 'smsf.customer-activity'
export const CUSTOMER_ACTIVITY_EVENT = 'smsf:customer-activity'

export function recordCustomerActivity(
  activity: Omit<CustomerActivityEvent, 'id' | 'timestamp'>,
) {
  const event: CustomerActivityEvent = {
    ...activity,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  }
  const events = readActivities()
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...events, event].slice(-500)))
  window.dispatchEvent(new CustomEvent(CUSTOMER_ACTIVITY_EVENT, { detail: event }))
}

export function getCustomerActivities(customerId?: string, contact?: string) {
  return readActivities().filter((event) =>
    (customerId && event.customerId === customerId) ||
    (contact && event.contact === contact),
  )
}

function readActivities(): CustomerActivityEvent[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as unknown
    return Array.isArray(value) ? value as CustomerActivityEvent[] : []
  } catch {
    return []
  }
}
