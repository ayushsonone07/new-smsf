import type { PillTone } from '../../ui/Pill'
import type { DepartmentUserRole } from '../../../features/departments/head/types/head.types'

export const ROLE_META: Record<
  DepartmentUserRole,
  { label: string; tone: PillTone }
> = {
  TEAM_LEAD: { label: 'Team Lead', tone: 'warning' },
  SENIOR_EXECUTIVE: {
    label: 'Senior Executive',
    tone: 'info',
  },
  ONBOARDING_EXECUTIVE: {
    label: 'Onboarding Executive',
    tone: 'info',
  },
  TRAINEE: { label: 'Trainee', tone: 'info' },
}

export const ROLE_OPTIONS = (
  Object.keys(ROLE_META) as DepartmentUserRole[]
).map((value) => ({
  value,
  label: ROLE_META[value].label,
}))
