import { useEffect, useRef, useState } from 'react'
import { getSession } from '../../app/auth/session'
import { ProfileMenu } from './ProfileMenu'

interface ProfileChipProps {
  initials?: string
  name?: string
  role?: string
}

export function ProfileChip({ initials, name, role }: ProfileChipProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const session = getSession()

  const displayName = name ?? session?.user.name ?? 'Admin'
  const displayRole = role ?? session?.user.role ?? 'Super Admin'
  const displayInitials =
    initials ?? displayName.slice(0, 2).toUpperCase() ?? 'A'

  useEffect(() => {
    if (!menuOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (
        wrapRef.current &&
        !wrapRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () =>
      document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  return (
    <div className="profile-chip__wrap" ref={wrapRef}>
      <button
        type="button"
        className="profile-chip profile-chip--clickable"
        title="Open profile settings"
        aria-label="Open profile settings"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((value) => !value)}
      >
        <div className="admin-avatar small">{displayInitials}</div>

        <div>
          <strong>{displayName}</strong>

          <span>{displayRole}</span>
        </div>

        <span
          className={`profile-chip__chevron${menuOpen ? ' is-open' : ''}`}
          aria-hidden="true"
        >
          ›
        </span>
      </button>

      {menuOpen ? (
        <div className="profile-chip__menu">
          <ProfileMenu onNavigate={() => setMenuOpen(false)} />
        </div>
      ) : null}
    </div>
  )
}
