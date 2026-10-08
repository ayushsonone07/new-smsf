import type { IconName } from '../../../components/head/shared/iconPaths'

export type PermissionLevel = 'CAN_READ' | 'CAN_EDIT'

/**
 * Which head-panel screen a feature opens. `custom`
 * renders a generic page until a component exists.
 */
export type HeadScreenKey =
  | 'dashboard'
  | 'users'
  | 'customers'
  | 'meeting'
  | 'sop'
  | 'help-center'
  | 'custom'

/**
 * A feature permission IS a head-panel nav item:
 * admin adds / removes / reorders / toggles these and
 * the department head's sidebar follows.
 */
export interface FeaturePermission {
  id: string
  departmentId: string
  name: string
  description: string
  enabled: boolean
  roleAPermission: PermissionLevel
  roleBPermission: PermissionLevel
  screen: HeadScreenKey
  /** URL segment under /head/, e.g. "users" */
  slug: string
  icon: IconName
  order: number
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
}

export type UpdateFeaturePermissionRequest =
  Partial<CreateFeaturePermissionRequest>
