import type { ReactNode } from 'react'

export type StatTone =
  | 'default'
  | 'primary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'teal'

export interface StatTileProps {
  label: ReactNode
  value: ReactNode
  tone?: StatTone
}

/**
 * Compact "label over value" tile used in summary
 * rows. Pass any ReactNode as value — e.g. several
 * <StatValue> pieces for "1 / 0" style splits.
 */
export function StatTile({
  label,
  value,
  tone = 'default',
}: StatTileProps) {
  return (
    <div className="stat-tile">
      <span className="stat-tile__label">
        {label}
      </span>

      <strong
        className={`stat-tile__value stat-tile__value--${tone}`}
      >
        {value}
      </strong>
    </div>
  )
}

interface StatValueProps {
  children: ReactNode
  tone?: StatTone
}

/** Inline coloured fragment inside a StatTile value. */
export function StatValue({
  children,
  tone = 'default',
}: StatValueProps) {
  return (
    <span className={`stat-tile__part stat-tile__part--${tone}`}>
      {children}
    </span>
  )
}

interface StatTileRowProps {
  items: StatTileProps[]
  columns?: number
}

/** Evenly spaced row of StatTile. */
export function StatTileRow({
  items,
  columns,
}: StatTileRowProps) {
  return (
    <div
      className="stat-tile-row"
      style={
        columns
          ? {
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }
          : undefined
      }
    >
      {items.map((item, index) => (
        <StatTile key={index} {...item} />
      ))}
    </div>
  )
}
