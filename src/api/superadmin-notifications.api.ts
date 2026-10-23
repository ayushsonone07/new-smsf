/**
 * Global, role-scoped notification store.
 *
 * The backend exposes no admin/super-admin notification feed (the
 * `/api/notifications/*` endpoints are customer-scoped), so this is a
 * self-contained, localStorage-backed store that every in-app bell reads
 * from. It starts empty and is the single source of truth until a real
 * notifications endpoint/microservice is wired up.
 *
 * Each record carries an `audience` discriminator so one store can serve
 * every role:
 *  - `ALL`        → visible to super admins (and, for scoped matches, heads)
 *  - `DEPARTMENT` → visible to members of the matching department
 *  - `CUSTOMER`   → visible to the matching customer
 */

import type { AuthUser } from '../features/auth/types/auth.types'

export type NotificationKind =
  | 'customer-assigned'
  | 'customer-transferred'
  | 'user-created'
  | 'user-updated'
  | 'user-deleted'
  | 'head-created'
  | 'head-deleted'
  | 'customer-deleted'
  | 'bill-generated'
  | 'service-completed'
  | 'call-initiated'

export type NotificationAudience = 'ALL' | 'DEPARTMENT' | 'CUSTOMER'

export interface SuperAdminNotification {
  id: string
  title: string
  message: string
  /** ISO timestamp. */
  createdAt: string
  read: boolean
  /** Optional in-app route to open when the notification is clicked. */
  link?: string
  /** Event type; used for icon/label and future filtering. */
  kind?: NotificationKind
  /** Who should see this notification. Defaults to `ALL` (super admin). */
  audience: NotificationAudience
  /** Department scope for `DEPARTMENT` audience. */
  departmentId?: string
  departmentType?: string
  /** Customer scope for `CUSTOMER` audience. */
  customerId?: string
}

/** Alias matching the store's role-agnostic purpose. */
export type AppNotification = SuperAdminNotification

const STORAGE_KEY = 'smsf.superadmin-notifications'

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function loadStore(): SuperAdminNotification[] {
  if (!isBrowser()) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (item): item is SuperAdminNotification =>
          Boolean(item) &&
          typeof item === 'object' &&
          typeof (item as SuperAdminNotification).id === 'string',
      )
      .map((item) => ({
        ...item,
        audience: item.audience ?? 'ALL',
      }))
  } catch {
    return []
  }
}

let notifications: SuperAdminNotification[] = loadStore()

const listeners = new Set<(items: SuperAdminNotification[]) => void>()

function persist(): void {
  try {
    if (isBrowser()) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications))
    }
  } catch {
    // ignore — notifications simply stay in memory
  }
}

function emit(): void {
  const snapshot = structuredClone(notifications)
  listeners.forEach((listener) => listener(snapshot))
}

function byNewest(a: SuperAdminNotification, b: SuperAdminNotification) {
  return b.createdAt.localeCompare(a.createdAt)
}

/** Whether `item` should be shown to `user`. */
export function notificationMatchesUser(
  item: SuperAdminNotification,
  user: AuthUser | null | undefined,
): boolean {
  if (!user) return false
  if (user.role === 'ADMIN') return true
  if (item.audience === 'ALL') return false
  if (item.audience === 'CUSTOMER') {
    return item.customerId != null && item.customerId === user.id
  }
  const departmentMatches =
    (item.departmentId != null && item.departmentId === user.departmentId) ||
    (item.departmentType != null &&
      item.departmentType === user.departmentType)
  return departmentMatches
}

export function subscribeSuperAdminNotifications(
  listener: (items: SuperAdminNotification[]) => void,
): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export async function getSuperAdminNotifications(): Promise<
  SuperAdminNotification[]
> {
  return structuredClone([...notifications].sort(byNewest))
}

export function getSuperAdminNotificationsSync(): SuperAdminNotification[] {
  return structuredClone([...notifications].sort(byNewest))
}

/** Notifications visible to the given user, newest first. */
export async function getNotificationsForUser(
  user: AuthUser | null | undefined,
): Promise<SuperAdminNotification[]> {
  return structuredClone(
    notifications.filter((item) => notificationMatchesUser(item, user)).sort(byNewest),
  )
}

export function getNotificationsForUserSync(
  user: AuthUser | null | undefined,
): SuperAdminNotification[] {
  return structuredClone(
    notifications.filter((item) => notificationMatchesUser(item, user)).sort(byNewest),
  )
}

/** Customer-scoped notifications, used to augment the backend customer feed. */
export function getNotificationsForCustomerSync(
  customerId: string | number | null | undefined,
): SuperAdminNotification[] {
  if (customerId == null) return []
  const id = String(customerId)
  return structuredClone(
    notifications
      .filter((item) => item.audience === 'CUSTOMER' && item.customerId === id)
      .sort(byNewest),
  )
}

export type NotificationInput = Omit<
  SuperAdminNotification,
  'id' | 'createdAt' | 'read' | 'audience' | 'customerId'
> & {
  id?: string
  createdAt?: string
  read?: boolean
  audience?: NotificationAudience
  /** For `CUSTOMER` (an id) or `DEPARTMENT` (a customer id, optional). */
  customerId?: string
}

/** Core emit helper — prepends, persists and notifies subscribers. */
export function notify(input: NotificationInput): SuperAdminNotification {
  const notification: SuperAdminNotification = {
    id: input.id ?? `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: input.title,
    message: input.message,
    createdAt: input.createdAt ?? new Date().toISOString(),
    read: input.read ?? false,
    link: input.link,
    kind: input.kind,
    audience: input.audience ?? 'ALL',
    departmentId: input.departmentId,
    departmentType: input.departmentType,
    customerId: input.customerId,
  }
  notifications = [notification, ...notifications]
  persist()
  emit()
  return structuredClone(notification)
}

export async function addSuperAdminNotification(
  input: NotificationInput,
): Promise<SuperAdminNotification> {
  return notify(input)
}

export async function markSuperAdminNotificationRead(id: string): Promise<void> {
  let changed = false
  notifications = notifications.map((item) => {
    if (item.id === id && !item.read) {
      changed = true
      return { ...item, read: true }
    }
    return item
  })
  if (changed) {
    persist()
    emit()
  }
}

export async function markAllSuperAdminNotificationsRead(): Promise<void> {
  let changed = false
  notifications = notifications.map((item) => {
    if (!item.read) {
      changed = true
      return { ...item, read: true }
    }
    return item
  })
  if (changed) {
    persist()
    emit()
  }
}

/** Mark all notifications visible to `user` as read. */
export async function markAllNotificationsForUserRead(
  user: AuthUser | null | undefined,
): Promise<void> {
  let changed = false
  notifications = notifications.map((item) => {
    if (!item.read && notificationMatchesUser(item, user)) {
      changed = true
      return { ...item, read: true }
    }
    return item
  })
  if (changed) {
    persist()
    emit()
  }
}

export async function markAllNotificationsForCustomerRead(
  customerId: string | number | null | undefined,
): Promise<void> {
  if (customerId == null) return
  const id = String(customerId)
  let changed = false
  notifications = notifications.map((item) => {
    if (item.audience === 'CUSTOMER' && item.customerId === id && !item.read) {
      changed = true
      return { ...item, read: true }
    }
    return item
  })
  if (changed) {
    persist()
    emit()
  }
}

export async function removeSuperAdminNotification(id: string): Promise<void> {
  const next = notifications.filter((item) => item.id !== id)
  if (next.length !== notifications.length) {
    notifications = next
    persist()
    emit()
  }
}
