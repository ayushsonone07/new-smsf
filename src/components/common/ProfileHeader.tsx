import type { ReactNode } from 'react'

export type ProfileHeaderTone = 'primary' | 'dark' | 'light'

interface ProfileHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  /** Letter(s) shown in avatar. Defaults to first letter of title when title is a string. */
  avatarText?: string
  avatarSrc?: string
  /** Right side slot — pills, buttons. */
  actions?: ReactNode
  onClose?: () => void
  tone?: ProfileHeaderTone
}

/**
 * Coloured banner with avatar + name + meta and an
 * actions area. Designed to sit at the top of a
 * flush <Modal /> but works in any card.
 */
export function ProfileHeader({
  title,
  subtitle,
  avatarText,
  avatarSrc,
  actions,
  onClose,
  tone = 'primary',
}: ProfileHeaderProps) {
  const initials =
    avatarText ??
    (typeof title === 'string'
      ? title.trim().charAt(0).toUpperCase()
      : '')

  return (
    <header
      className={`profile-header profile-header--${tone}`}
    >
      <div className="profile-header__identity">
        {avatarSrc ? (
          <img
            className="profile-header__avatar"
            src={avatarSrc}
            alt=""
          />
        ) : (
          <div className="profile-header__avatar">
            {initials}
          </div>
        )}

        <div className="profile-header__text">
          <h2>{title}</h2>

          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>

      <div className="profile-header__actions">
        {actions}

        {onClose ? (
          <button
            type="button"
            className="profile-header__close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        ) : null}
      </div>
    </header>
  )
}
