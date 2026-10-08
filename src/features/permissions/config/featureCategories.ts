import type { IconName } from '../../../components/head/shared/iconPaths'
import type {
  FeatureCategoryKey,
  FeaturePermission,
} from '../types/permission.types'

export interface FeatureCategoryMeta {
  key: FeatureCategoryKey
  label: string
  description: string
  icon: IconName
}

/**
 * Categories the admin permissions page renders as
 * separate blocks — menu items stay apart from the
 * column lists of the Customer / Department Users tables.
 */
export const FEATURE_CATEGORIES: FeatureCategoryMeta[] = [
  {
    key: 'screens',
    label: 'Head Panel Menu',
    description:
      'Sidebar items of this department. Reorder, enable/disable and set Role A / Role B access.',
    icon: 'grid',
  },
  {
    key: 'customers',
    label: 'Customer List — Columns',
    description:
      'Columns shown in the customer table. Switch a column off to hide it from the head panel.',
    icon: 'list',
  },
  {
    key: 'users',
    label: 'Department Users — Columns',
    description:
      'Columns shown in the department users table. Switch a column off to hide it from the head panel.',
    icon: 'userPlus',
  },
]

export function categoryMeta(
  key: FeatureCategoryKey,
): FeatureCategoryMeta {
  return (
    FEATURE_CATEGORIES.find((item) => item.key === key) ??
    FEATURE_CATEGORIES[0]
  )
}

export interface ColumnFeatureTemplate {
  columnKey: string
  name: string
  description: string
  /** Role B (department user) starts read-only for controls. */
  roleBDefault?: 'CAN_READ' | 'CAN_EDIT'
}

/** Columns of the customer table (`CustomerTable`). */
export const CUSTOMER_COLUMN_TEMPLATE: ColumnFeatureTemplate[] = [
  {
    columnKey: 'customer',
    name: 'Customer',
    description: 'Customer name and email address',
  },
  {
    columnKey: 'company',
    name: 'Company',
    description: 'Company the customer belongs to',
  },
  {
    columnKey: 'phone',
    name: 'Phone',
    description: 'Contact number',
  },
  {
    columnKey: 'status',
    name: 'Status',
    description: 'Active / inactive badge',
  },
  {
    columnKey: 'created',
    name: 'Created',
    description: 'Onboarding date',
  },
  {
    columnKey: 'actions',
    name: 'Actions',
    description: 'Edit and delete controls',
    roleBDefault: 'CAN_READ',
  },
]

/** Columns of the department users table (`DepartmentUsersTable`). */
export const USER_COLUMN_TEMPLATE: ColumnFeatureTemplate[] = [
  {
    columnKey: 'name',
    name: 'Name',
    description: 'User name, avatar and joined date',
  },
  {
    columnKey: 'phone',
    name: 'Number',
    description: 'Contact number',
  },
  {
    columnKey: 'email',
    name: 'Email',
    description: 'Work email address',
  },
  {
    columnKey: 'role',
    name: 'Role',
    description: 'Department role pill',
  },
  {
    columnKey: 'target',
    name: 'Target',
    description: 'Monthly onboarding target',
  },
  {
    columnKey: 'achieved',
    name: 'Achieved',
    description: 'Achievement percentage',
  },
  {
    columnKey: 'attendance',
    name: 'P / A days',
    description: 'Present and absent days',
  },
  {
    columnKey: 'actions',
    name: 'Actions',
    description: 'View, edit and delete controls',
    roleBDefault: 'CAN_READ',
  },
]

export const COLUMN_TEMPLATES: Record<
  'customers' | 'users',
  ColumnFeatureTemplate[]
> = {
  customers: CUSTOMER_COLUMN_TEMPLATE,
  users: USER_COLUMN_TEMPLATE,
}

/** Column features of one category, keyed by their column key. */
export function columnsByFeature(
  features: FeaturePermission[],
  category: 'customers' | 'users',
): Record<string, FeaturePermission> {
  const map: Record<string, FeaturePermission> = {}

  for (const feature of features) {
    if (
      feature.kind === 'column' &&
      feature.category === category &&
      feature.columnKey
    ) {
      map[feature.columnKey] = feature
    }
  }

  return map
}
