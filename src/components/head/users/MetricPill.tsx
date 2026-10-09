import { Pill } from '../../ui/Pill'

interface AchievedPillProps {
  percent: number
  /** Percent at/above which the pill turns green. Default 100. */
  threshold?: number
}

/** Green when target met, blue otherwise. */
export function AchievedPill({
  percent,
  threshold = 100,
}: AchievedPillProps) {
  return (
    <Pill
      tone={percent >= threshold ? 'success' : 'info'}
      className="metric-pill"
    >
      {percent}%
    </Pill>
  )
}

interface AttendancePillsProps {
  present: number
  absent: number
}

/** "23 P" green + "1 A" red pair. */
export function AttendancePills({
  present,
  absent,
}: AttendancePillsProps) {
  return (
    <span className="attendance-pills">
      <Pill tone="success" className="metric-pill">
        {present} P
      </Pill>

      <Pill tone="danger" className="metric-pill">
        {absent} A
      </Pill>
    </span>
  )
}
