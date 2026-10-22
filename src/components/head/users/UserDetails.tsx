import { motion, type Variants } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { ROLE_META } from './roleMeta'
import type { DepartmentUser } from '../../../features/departments/head/types/head.types'

export interface UserDetailsProps {
  user: DepartmentUser
  onAttendanceToggle?: (user: DepartmentUser, checked: boolean) => void | Promise<void>
  onSeniorUserToggle?: (user: DepartmentUser, checked: boolean) => void | Promise<void>
  onHelpTicketsToggle?: (user: DepartmentUser, checked: boolean) => void | Promise<void>
  isUpdatingAttendance?: boolean
  isUpdatingSenior?: boolean
  isUpdatingHelpTickets?: boolean
  canManage?: boolean
}

const detailVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.03 } },
}

const detailItemVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18 } },
}

/** Key/value summary and interactive toggle controls shown when a user row is expanded. */
export function UserDetails({
  user,
  onAttendanceToggle,
  onSeniorUserToggle,
  onHelpTicketsToggle,
  isUpdatingAttendance = false,
  isUpdatingSenior = false,
  isUpdatingHelpTickets = false,
  canManage = true,
}: UserDetailsProps) {
  const rows: { label: string; value: string }[] = [
    { label: 'Role', value: ROLE_META[user.role]?.label || user.role },
    { label: 'Joined', value: user.joinedLabel },
    { label: 'Monthly target', value: String(user.target) },
    { label: 'Achieved', value: `${user.achievedPercent}%` },
    {
      label: 'Attendance',
      value: `${user.presentDays} present · ${user.absentDays} absent`,
    },
  ]

  const isPresent = Boolean(user.isPresentToday)
  const isSenior = Boolean(user.isSeniorUser)
  const isHelpTickets = Boolean(user.isAddUserDb)

  return (
    <motion.div
      className="user-details"
      initial="hidden"
      animate="visible"
      variants={detailVariants}
    >
      {/* Information fields */}
      {rows.map((row) => (
        <motion.div key={row.label} variants={detailItemVariants} className="user-details__item">
          <span>{row.label}</span>
          <strong>{row.value}</strong>
        </motion.div>
      ))}

      {/* PRESENT / ABSENT TOGGLE */}
      <motion.div
        variants={detailItemVariants}
        className="user-details__item user-details__item--control"
        style={{ cursor: isUpdatingAttendance ? 'wait' : 'pointer' }}
        onClick={() => {
          if (!isUpdatingAttendance && onAttendanceToggle) {
            onAttendanceToggle(user, !isPresent)
          }
        }}
      >
        <span>PRESENT</span>
        <div className="user-details__control-row">
          <button
            type="button"
            role="switch"
            aria-checked={isPresent}
            aria-label="Toggle present or absent"
            disabled={isUpdatingAttendance}
            className={`toggle-switch toggle-switch--present ${isPresent ? 'on' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              if (!isUpdatingAttendance && onAttendanceToggle) {
                onAttendanceToggle(user, !isPresent)
              }
            }}
            title={isPresent ? 'Click to mark Absent' : 'Click to mark Present'}
          >
            <span style={{ pointerEvents: 'none' }} />
          </button>
          <div className="user-details__control-status">
            {isUpdatingAttendance ? (
              <span className="user-details__spinner-wrap">
                <Loader2 className="animate-spin" size={14} />
                <span>Updating…</span>
              </span>
            ) : (
              <span className={`user-details__badge ${isPresent ? 'user-details__badge--present' : 'user-details__badge--absent'}`}>
                {isPresent ? 'Present' : 'Absent'}
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* SENIOR USER TOGGLE */}
      <motion.div
        variants={detailItemVariants}
        className="user-details__item user-details__item--control"
        style={{ cursor: isUpdatingSenior ? 'wait' : 'pointer' }}
        onClick={() => {
          if (!isUpdatingSenior && onSeniorUserToggle) {
            onSeniorUserToggle(user, !isSenior)
          }
        }}
      >
        <span>SENIOR USER</span>
        <div className="user-details__control-row">
          <button
            type="button"
            role="switch"
            aria-checked={isSenior}
            aria-label="Toggle senior user status"
            disabled={isUpdatingSenior}
            className={`toggle-switch toggle-switch--senior ${isSenior ? 'on' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              if (!isUpdatingSenior && onSeniorUserToggle) {
                onSeniorUserToggle(user, !isSenior)
              }
            }}
            title={isSenior ? 'Click to remove Senior User' : 'Click to set Senior User'}
          >
            <span style={{ pointerEvents: 'none' }} />
          </button>
          <div className="user-details__control-status">
            {isUpdatingSenior ? (
              <span className="user-details__spinner-wrap">
                <Loader2 className="animate-spin" size={14} />
                <span>Updating…</span>
              </span>
            ) : (
              <span className={`user-details__badge ${isSenior ? 'user-details__badge--senior' : 'user-details__badge--standard'}`}>
                {isSenior ? 'Senior' : 'Regular'}
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* HELP TICKETS / TICKET DB TOGGLE */}
      <motion.div
        variants={detailItemVariants}
        className="user-details__item user-details__item--control"
        style={{ cursor: isUpdatingHelpTickets ? 'wait' : 'pointer' }}
        onClick={() => {
          if (!isUpdatingHelpTickets && onHelpTicketsToggle) {
            onHelpTicketsToggle(user, !isHelpTickets)
          }
        }}
      >
        <span>HELP TICKETS</span>
        <div className="user-details__control-row">
          <button
            type="button"
            role="switch"
            aria-checked={isHelpTickets}
            aria-label="Toggle Help Tickets database access"
            disabled={isUpdatingHelpTickets}
            className={`toggle-switch toggle-switch--ticket ${isHelpTickets ? 'on' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              if (!isUpdatingHelpTickets && onHelpTicketsToggle) {
                onHelpTicketsToggle(user, !isHelpTickets)
              }
            }}
            title={isHelpTickets ? 'Click to remove from Ticket database' : 'Click to add to Ticket database'}
          >
            <span style={{ pointerEvents: 'none' }} />
          </button>
          <div className="user-details__control-status">
            {isUpdatingHelpTickets ? (
              <span className="user-details__spinner-wrap">
                <Loader2 className="animate-spin" size={14} />
                <span>Updating…</span>
              </span>
            ) : (
              <span className={`user-details__badge ${isHelpTickets ? 'user-details__badge--ticket-active' : 'user-details__badge--ticket-inactive'}`}>
                {isHelpTickets ? 'Active in DB' : 'Not Added'}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
