import type { ReactNode } from 'react'

export interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
  count?: number
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Stretch options to equal width (used for Head/User switch). */
  fill?: boolean
  size?: 'sm' | 'md'
  ariaLabel?: string
  className?: string
}

/**
 * Pill-style segmented tabs with optional counts —
 * the blue "selected" style used all over the console
 * (status filters, Head/User switch, dashboard tabs).
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  fill = false,
  size = 'md',
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  const classes = [
    'seg',
    fill ? 'seg--fill' : null,
    size === 'sm' ? 'seg--sm' : null,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={classes}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const on = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            className={`seg__btn${on ? ' is-on' : ''}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}

            {option.count !== undefined ? (
              <span className="seg__count">{option.count}</span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
