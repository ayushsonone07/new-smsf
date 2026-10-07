import type { Department } from '../../features/departments/types/department.types'
import type {
  FeaturePermission,
  PermissionLevel,
} from '../../features/permissions/types/permission.types'

export const FEATURE_TEMPLATE: Array<{
  name: string
  description: string
  defaultEnabled: boolean
}> = [
  {
    name: 'Dashboard',
    description: 'Overview widgets and KPI cards',
    defaultEnabled: true,
  },
  {
    name: 'Reports',
    description: 'Generate and export reports',
    defaultEnabled: true,
  },
  {
    name: 'User Management',
    description: 'Create and manage user accounts',
    defaultEnabled: true,
  },
  {
    name: 'Billing',
    description: 'Invoices and payment records',
    defaultEnabled: true,
  },
  {
    name: 'Audit Log',
    description: 'Track activity history',
    defaultEnabled: false,
  },
  {
    name: 'Settings',
    description: 'Workspace configuration',
    defaultEnabled: true,
  },
  {
    name: 'Notifications',
    description: 'Alerts and email preferences',
    defaultEnabled: false,
  },
  {
    name: 'Data Export',
    description: 'Export data to CSV',
    defaultEnabled: true,
  },
]

export const departments: Department[] = [
  {
    id: 'dept-1',
    name: 'Finance',
    username: 'finance.dept',
    email: 'finance@smsf.test',
    status: 'ACTIVE',
    createdAt: '2026-01-12T10:00:00.000Z',
  },
  {
    id: 'dept-2',
    name: 'Operations',
    username: 'operations.dept',
    email: 'operations@smsf.test',
    status: 'ACTIVE',
    createdAt: '2026-03-04T08:30:00.000Z',
  },
]

export const featurePermissions: FeaturePermission[] = []

let departmentIdCounter = departments.length + 1
let featureIdCounter = 1

export function delay(ms = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function nextDepartmentId(): string {
  const id = `dept-${departmentIdCounter}`
  departmentIdCounter += 1
  return id
}

export function nextFeatureId(): string {
  const id = `feat-${featureIdCounter}`
  featureIdCounter += 1
  return id
}

export function seedFeaturePermissions(
  departmentId: string,
): FeaturePermission[] {
  const defaults: PermissionLevel[] = ['CAN_READ', 'CAN_EDIT']

  const created = FEATURE_TEMPLATE.map(
    (feature, index): FeaturePermission => ({
      id: nextFeatureId(),
      departmentId,
      name: feature.name,
      description: feature.description,
      enabled: feature.defaultEnabled,
      roleAPermission: defaults[index % 2],
      roleBPermission: 'CAN_READ',
    }),
  )

  featurePermissions.push(...created)

  return created
}

export function removeFeaturePermissions(
  departmentId: string,
): void {
  const remaining = featurePermissions.filter(
    (feature) => feature.departmentId !== departmentId,
  )

  featurePermissions.length = 0
  featurePermissions.push(...remaining)
}

seedFeaturePermissions('dept-1')
seedFeaturePermissions('dept-2')
