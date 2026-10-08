import { motion } from 'framer-motion'
import './MeetingFilters.css'

export type MeetingStatus = 'all' | 'done' | 'not-done'

export interface MeetingFiltersProps {
  status: MeetingStatus
  onStatusChange: (status: MeetingStatus) => void
  doneCount: number
  notDoneCount: number
}

/**
 * Renders the Meeting Done / Meeting Not Done status tabs.
 * Used in the left section of the control row.
 */
export function MeetingFilters({
  status,
  onStatusChange,
  doneCount,
  notDoneCount,
}: MeetingFiltersProps) {
  return (
    <div className="meeting-filters">
      <div className="meeting-filters__status-tabs">
        <motion.button
          type="button"
          className={`meeting-filters__status-tab ${status === 'done' ? 'is-active' : ''}`}
          onClick={() => onStatusChange('done')}
          whileTap={{ scale: 0.95 }}
        >
          Meeting Done
          <span className="meeting-filters__status-count">{doneCount}</span>
        </motion.button>
        <motion.button
          type="button"
          className={`meeting-filters__status-tab ${status === 'not-done' ? 'is-active' : ''}`}
          onClick={() => onStatusChange('not-done')}
          whileTap={{ scale: 0.95 }}
        >
          Meeting Not Done
          <span className="meeting-filters__status-count">{notDoneCount}</span>
        </motion.button>
      </div>
    </div>
  )
}