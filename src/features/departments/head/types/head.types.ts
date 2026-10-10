import type { IconName } from '../../../../components/head/shared/iconPaths'

/* ---------- shell ---------- */

export type HeadRole = 'HEAD' | 'USER'

export interface HeadNavItem {
  key: string
  label: string
  icon: IconName
  /** Route path. Omit for items without a page yet. */
  to?: string
}

export interface HeadAccount {
  /** Shown in the sidebar footer (email or name). */
  label: string
  roleLabel: string
  initial?: string
}

export interface HeadNotification {
  id: string
  text: string
  timeLabel: string
  unread?: boolean
}

/* ---------- department users ---------- */

export type DepartmentUserRole =
  | 'TEAM_LEAD'
  | 'SENIOR_EXECUTIVE'
  | 'ONBOARDING_EXECUTIVE'
  | 'TRAINEE'

export interface DepartmentUser {
  id: string
  name: string
  phone: string
  email: string
  role: DepartmentUserRole
  joinedLabel: string
  target: number
  achievedPercent: number
  presentDays: number
  absentDays: number
  isPresentToday: boolean
  avatarSrc?: string
  /** Unmodified backend row used by admin-created dynamic columns. */
  dynamicValues?: Record<string, unknown>
}

export interface DepartmentUserFormValues {
  name: string
  phone: string
  target: number
  email: string
  role: DepartmentUserRole
  temporaryPassword: string
}
