import type { DepartmentUserColumnKey } from '../../../../components/head/users/DepartmentUsersTable'

/** Fixed columns of the Department Users table, in render order. */
export const USER_TABLE_COLUMN_KEYS: DepartmentUserColumnKey[] = [
  'name',
  'phone',
  'email',
  'role',
  'target',
  'achieved',
  'attendance',
  'actions',
]

/**
 * Aliases accepted from the backend `columnName` for each fixed column.
 * Values are compared after normalisation (lowercase, alphanumerics only).
 */
const COLUMN_ALIASES: Record<DepartmentUserColumnKey, string[]> = {
  name: ['name', 'username', 'user', 'fullname', 'employeename', 'member', 'membername'],
  phone: [
    'number',
    'phone',
    'phonenumber',
    'contact',
    'contactnumber',
    'mobile',
    'mobilenumber',
    'cell',
    'cellnumber',
  ],
  email: ['email', 'emailaddress', 'emailid', 'mail'],
  role: ['role', 'userrole', 'designation', 'position'],
  target: ['target', 'goal', 'monthlytarget', 'assignedtarget'],
  achieved: [
    'achieved',
    'achievement',
    'achievedpercent',
    'achievementpercent',
    'completed',
    'completion',
    'progress',
  ],
  attendance: [
    'attendance',
    'padays',
    'presentabsentdays',
    'presentdays',
    'absentdays',
    'present',
    'absent',
  ],
  actions: ['actions', 'action', 'operations', 'controls'],
}

function normalize(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]/g, '')
}

/**
 * Resolves a backend column name to one of the table's fixed column keys.
 * Returns null when the name does not correspond to a fixed column.
 */
export function resolveUserColumnKey(
  columnName?: string | null,
): DepartmentUserColumnKey | null {
  if (!columnName) return null
  const normalized = normalize(columnName)
  if (!normalized) return null

  for (const key of USER_TABLE_COLUMN_KEYS) {
    if (COLUMN_ALIASES[key].includes(normalized)) return key
  }

  return null
}
