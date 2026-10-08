import type { ReactNode } from 'react'
import { Pill } from '../ui/Pill'
import type { PillTone } from '../ui/Pill'

/* ------------------------------------------------
   Generic table cell building blocks.
   Pure presentation — no data fetching.
   ------------------------------------------------ */

interface EntityCellProps {
  primary: ReactNode
  /** Secondary parts are joined with a " · " separator. */
  secondary?: ReactNode[]
}

/** Bold name over muted meta ("Rakesh Sharma · Jaipur"). */
export function EntityCell({
  primary,
  secondary = [],
}: EntityCellProps) {
  const parts = secondary.filter(
    (part) => part !== undefined && part !== null && part !== '',
  )

  return (
    <div className="entity-cell">
      <strong>{primary}</strong>

      {parts.length > 0 ? (
        <span>
          {parts.map((part, index) => (
            <span key={index}>
              {index > 0 ? ' · ' : null}
              {part}
            </span>
          ))}
        </span>
      ) : null}
    </div>
  )
}

interface DelayCellProps {
  /** 0 or less = on time. */
  days: number
  /** Optional tag shown below the delay text. */
  tag?: { label: ReactNode; tone?: PillTone }
  onTimeLabel?: ReactNode
}

/** "On time" in green, or "N days delayed" in red with an optional side tag. */
export function DelayCell({
  days,
  tag,
  onTimeLabel = 'On time',
}: DelayCellProps) {
  const delayed = days > 0

  return (
    <div className="delay-cell">
      <span
        className={`delay-cell__text ${
          delayed
            ? 'delay-cell__text--late'
            : 'delay-cell__text--ok'
        }`}
      >
        {delayed
          ? `${days} ${days === 1 ? 'day' : 'days'} delayed`
          : onTimeLabel}
      </span>

      {tag ? (
        <Pill tone={tag.tone ?? 'neutral'} size="sm">
          {tag.label}
        </Pill>
      ) : null}
    </div>
  )
}

interface RemarkCellProps {
  /** Headline line (e.g. reason). */
  title?: ReactNode
  /** Secondary line (e.g. last remark). */
  note?: ReactNode
  /** Highlights the title in red. */
  alert?: boolean
  /** Full text shown on hover. */
  hoverText?: string
}

/** Two-line remark with optional alert colouring and full-text tooltip. */
export function RemarkCell({
  title,
  note,
  alert = false,
  hoverText,
}: RemarkCellProps) {
  return (
    <div className="remark-cell" title={hoverText}>
      {title ? (
        <span
          className={`remark-cell__title${
            alert ? ' remark-cell__title--alert' : ''
          }`}
        >
          {title}
        </span>
      ) : null}

      {note ? (
        <span className="remark-cell__note">
          {note}
        </span>
      ) : null}
    </div>
  )
}
