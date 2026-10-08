import { Icon } from '../shared/Icon'

interface ImpersonationBannerProps {
  name: string
  onExit: () => void
  actionLabel?: string
}

/** Yellow "You are logged in as X" strip. */
export function ImpersonationBanner({
  name,
  onExit,
  actionLabel = 'Back to my account',
}: ImpersonationBannerProps) {
  return (
    <div className="himp" role="status">
      <Icon name="login" size={15} strokeWidth={1.9} />

      <span>
        You are logged in as <strong>{name}</strong> — everything you
        see is their view.
      </span>

      <button type="button" className="himp__btn" onClick={onExit}>
        {actionLabel}
      </button>
    </div>
  )
}
