import { getSession } from '../../app/auth/session'

interface ProfileChipProps {
  initials?: string
  name?: string
  role?: string
}

export function ProfileChip({ initials, name, role }: ProfileChipProps) {
  const session = getSession()

  const displayName = name ?? session?.user.name ?? session?.user.username ?? 'Admin'
  const displayRole = role ?? session?.user.role ?? 'ADMIN'
  const displayInitials =
    initials ?? displayName.slice(0, 2).toUpperCase() ?? 'AD'

  return (
    <div className="profile-chip" aria-label="Current user">
      <div className="admin-avatar small">{displayInitials}</div>

      <div>
        <strong>{displayName}</strong>
        <span>{displayRole}</span>
      </div>
    </div>
  )
}
