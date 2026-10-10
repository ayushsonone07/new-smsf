import type { IconName } from '../../../components/head/shared/iconPaths'

export type PermissionLevel = 'CAN_READ' | 'CAN_EDIT'

/**
 * Where a feature shows up on the admin permissions page.
 * `screens`  → head panel sidebar items
 * `customers`→ columns of the Customer List table
 * `users`    → columns of the Department Users table
 *
 * Categories are always rendered as separate blocks so the
 * admin can manage them independently.
 */
export type FeatureCategoryKey =
  | 'screens'
  | 'customers'
  | 'users'

/**
 * `screen` = a page (own slug / route in the head panel).
 * `column` = a table column (on/off + permission only).
 */
export type FeatureKind = 'screen' | 'column'

/**
 * Which head-panel screen a feature opens. `custom`
 * renders a generic page until a component exists.
 */
export type HeadScreenKey =
  | 'dashboard'
  | 'users'
  | 'customers'
  | 'attendance'
  | 'meeting'
  | 'sop'
  | 'help-center'
  | 'history'
  | 'analytics'
  | 'service-flow'
  | 'member-flow'
  | 'help-support'
  | 'custom'

/**
 * A feature permission IS a head-panel nav item:
 * admin adds / removes / reorders / toggles these and
 * the department head's sidebar follows.
 *
 * Column features (`kind: 'column'`) never become nav
 * items — they decide which table columns are visible and
 * whether Role A / Role B may edit them.
 */
export interface FeaturePermission {
  id: string
  departmentId: string
  name: string
  description: string
  enabled: boolean
  /**
   * Shown in the USER panel (sidebar item / table column).
   * Undefined counts as visible. HEAD / ADMIN ignore it.
   */
  userVisible?: boolean
  roleAPermission: PermissionLevel
  roleBPermission: PermissionLevel
  screen: HeadScreenKey
  /** URL segment under /head/, e.g. "users" */
  slug: string
  icon: IconName
  order: number
  category: FeatureCategoryKey
  kind: FeatureKind
  /** Column key inside the owning table (column features only). */
  columnKey?: string
}

export interface CreateFeaturePermissionRequest {
  name: string
  description: string
  screen: HeadScreenKey
  slug: string
  icon: IconName
  enabled: boolean
  roleAPermission: PermissionLevel
  roleBPermission: PermissionLevel
  /** Defaults to `screens` — only menu items are admin-created. */
  category?: FeatureCategoryKey
  kind?: FeatureKind
  columnKey?: string
  /** Shown in the USER panel (sidebar item / table column). */
  userVisible?: boolean
}

export type UpdateFeaturePermissionRequest =
  Partial<CreateFeaturePermissionRequest>
