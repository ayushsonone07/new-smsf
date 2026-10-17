import { Pill } from '../../ui/Pill'
import { ROLE_META } from './roleMeta'
import type { DepartmentUserRole } from '../../../features/departments/head/types/head.types'

interface RolePillProps {
  role: DepartmentUserRole
}

export function RolePill({ role }: RolePillProps) {
  const meta = ROLE_META[role] || {
    label: (String(role || 'User')).replace(/_/g, ' '),
    tone: 'info' as const,
  }

  return (
    <Pill tone={meta.tone ?? 'info'} className="role-pill">
      {meta.label}
    </Pill>
  )
}
