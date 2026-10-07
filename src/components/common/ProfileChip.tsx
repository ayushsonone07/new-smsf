interface ProfileChipProps {
  initials?: string
  name?: string
  role?: string
}

export function ProfileChip({
  initials = 'A',
  name = 'Admin',
  role = 'Super Admin',
}: ProfileChipProps) {
  return (
    <div className="profile-chip">
      <div className="admin-avatar small">
        {initials}
      </div>

      <div>
        <strong>{name}</strong>

        <span>{role}</span>
      </div>
    </div>
  )
}
