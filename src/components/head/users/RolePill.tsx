import { Pill } from '../../ui/Pill'
import { ROLE_META } from './roleMeta'
import type { DepartmentUserRole } from '../../../features/departments/head/types/head.types'

interface RolePillProps {
  role: DepartmentUserRole
}

export function RolePill({ role }: RolePillProps) {
  const meta = ROLE_META[role]

  return (
    <Pill tone={meta.tone} className="role-pill">
      {meta.label}
    </Pill>
  )
}
