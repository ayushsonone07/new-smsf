import { Icon } from './Icon'

interface LearningButtonProps {
  label?: string
  newCount?: number
  onClick?: () => void
}

/** Yellow "Department Learning" button with a "N new" counter. */
export function LearningButton({
  label = 'Department Learning',
  newCount = 0,
  onClick,
}: LearningButtonProps) {
  return (
    <button
      type="button"
      className="learning-button"
      onClick={onClick}
    >
      <Icon name="book" />
      {label}

      {newCount > 0 ? (
        <span className="learning-button__count">
          {newCount} new
        </span>
      ) : null}
    </button>
  )
}
