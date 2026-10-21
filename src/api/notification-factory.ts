/**
 * Intent-named notification emitters.
 *
 * Thin, one-line helpers over the global store (`notify`) so CRUD call
 * sites stay readable. Department events fan out to the acting department
 * (heads/users) and, because super admins see everything, to the Admin
 * Portal as well.
 */

import { getSession } from '../app/auth/session'
import type { AuthUser } from '../features/auth/types/auth.types'
import {
  notify,
  type NotificationKind,
  type SuperAdminNotification,
} from './superadmin-notifications.api'

function actor(): AuthUser | null {
  return getSession()?.user ?? null
}

function actorLabel(): string {
  const user = actor()
  return user?.name || user?.email || 'Someone'
}

interface EmitOptions {
  kind: NotificationKind
  title: string
  message: string
  link?: string
  /** Department scope; defaults to the acting user's department. */
  departmentId?: string
  departmentType?: string
  /** When set, the notification is scoped to this customer. */
  customerId?: string
  /** Audience override; department events default to `DEPARTMENT`. */
  audience?: SuperAdminNotification['audience']
}

function emitScoped(options: EmitOptions): SuperAdminNotification {
  const user = actor()
  const audience = options.audience ?? 'DEPARTMENT'
  return notify({
    kind: options.kind,
    title: options.title,
    message: options.message,
    link: options.link,
    audience,
    departmentId: options.departmentId ?? user?.departmentId,
    departmentType: options.departmentType ?? user?.departmentType,
    customerId: options.customerId,
  })
}

interface CustomerRef {
  id?: string | number | null
  name?: string | null
  businessName?: string | null
}

function customerLabel(customer: CustomerRef): string {
  return (
    customer.name ||
    customer.businessName ||
    (customer.id != null ? `Customer #${customer.id}` : 'Customer')
  )
}

export function notifyCustomerAssigned(
  customer: CustomerRef,
  assignee: string,
  departmentLabel?: string,
): SuperAdminNotification {
  return emitScoped({
    kind: 'customer-assigned',
    title: 'Customer assigned',
    message: `${actorLabel()} assigned ${customerLabel(customer)} to ${assignee}${
      departmentLabel ? ` (${departmentLabel})` : ''
    }.`,
    customerId: customer.id != null ? String(customer.id) : undefined,
  })
}

export function notifyCustomerTransferred(
  fromUserEmail: string,
  toUserEmail: string,
  count?: number,
): SuperAdminNotification {
  const scope = count != null ? ` (${count} customer${count === 1 ? '' : 's'})` : ''
  return emitScoped({
    kind: 'customer-transferred',
    title: 'Customers transferred',
    message: `${actorLabel()} transferred customers from ${fromUserEmail} to ${toUserEmail}${scope}.`,
  })
}

export function notifyUserCreated(name: string, email: string): SuperAdminNotification {
  return emitScoped({
    kind: 'user-created',
    title: 'Team member added',
    message: `${actorLabel()} added ${name || email} to the department.`,
  })
}

export function notifyUserUpdated(name: string, email: string): SuperAdminNotification {
  return emitScoped({
    kind: 'user-updated',
    title: 'Team member updated',
    message: `${actorLabel()} updated ${name || email}.`,
  })
}

export function notifyUserDeleted(name: string, email: string): SuperAdminNotification {
  return emitScoped({
    kind: 'user-deleted',
    title: 'Team member removed',
    message: `${actorLabel()} removed ${name || email} from the department.`,
  })
}

export function notifyHeadCreated(name: string, email: string): SuperAdminNotification {
  return emitScoped({
    kind: 'head-created',
    title: 'Department created',
    message: `${actorLabel()} created department head ${name || email}.`,
    audience: 'ALL',
  })
}

export function notifyHeadDeleted(name: string, email: string): SuperAdminNotification {
  return emitScoped({
    kind: 'head-deleted',
    title: 'Department removed',
    message: `${actorLabel()} removed department head ${name || email}.`,
    audience: 'ALL',
  })
}

export function notifyCustomerDeleted(customer: CustomerRef): SuperAdminNotification {
  return emitScoped({
    kind: 'customer-deleted',
    title: 'Customer deleted',
    message: `${actorLabel()} deleted ${customerLabel(customer)}.`,
    customerId: customer.id != null ? String(customer.id) : undefined,
  })
}

export function notifyBillGenerated(customer: CustomerRef): SuperAdminNotification {
  const id = customer.id != null ? String(customer.id) : undefined
  // Visible to the department and (when scoped) to the customer.
  const record = emitScoped({
    kind: 'bill-generated',
    title: 'Bill generated',
    message: `Bill generated for ${customerLabel(customer)}.`,
    customerId: id,
  })
  if (id) {
    notify({
      kind: 'bill-generated',
      title: 'Bill generated',
      message: `Your bill for ${customerLabel(customer)} is ready.`,
      audience: 'CUSTOMER',
      customerId: id,
    })
  }
  return record
}

export function notifyServiceCompleted(
  customer: CustomerRef,
  serviceName?: string,
): SuperAdminNotification {
  const id = customer.id != null ? String(customer.id) : undefined
  const suffix = serviceName ? ` (${serviceName})` : ''
  const record = emitScoped({
    kind: 'service-completed',
    title: 'Service completed',
    message: `Service completed for ${customerLabel(customer)}${suffix}.`,
    customerId: id,
  })
  if (id) {
    notify({
      kind: 'service-completed',
      title: 'Service completed',
      message: `${serviceName || 'Your service'} for ${customerLabel(customer)} has been completed.`,
      audience: 'CUSTOMER',
      customerId: id,
    })
  }
  return record
}
