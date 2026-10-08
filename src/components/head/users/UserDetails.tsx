import { ROLE_META } from './roleMeta'
import type { DepartmentUser } from '../../../features/departments/head/types/head.types'

interface UserDetailsProps {
  user: DepartmentUser
}

/** Key/value summary shown when a user row is expanded. */
export function UserDetails({ user }: UserDetailsProps) {
  const rows: { label: string; value: string }[] = [
    { label: 'Role', value: ROLE_META[user.role].label },
    { label: 'Joined', value: user.joinedLabel },
    { label: 'Monthly target', value: String(user.target) },
    { label: 'Achieved', value: `${user.achievedPercent}%` },
    {
      label: 'Attendance',
      value: `${user.presentDays} present · ${user.absentDays} absent`,
    },
    {
      label: 'Today',
      value: user.isPresentToday ? 'Present' : 'Absent',
    },
  ]

  return (
    <div className="user-details">
      {rows.map((row) => (
        <div key={row.label}>
          <span>{row.label}</span>
          <strong>{row.value}</strong>
        </div>
      ))}
    </div>
  )
}
