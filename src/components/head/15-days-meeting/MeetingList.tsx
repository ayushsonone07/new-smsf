import { useMemo } from 'react'
import { motion, type Variants } from 'framer-motion'
import { Button } from '../../ui/Button'
import { Pill } from '../../ui/Pill'
import { Icon } from '../shared/Icon'
import { IconButton } from '../shared/IconButton'
import type { IconName } from '../shared/iconPaths'
import './MeetingList.css'

const tbodyVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
}

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22 } },
}

const emptyVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.24 } },
}

export interface MeetingCustomer {
  name: string
  company: string
  phone: string
  email: string
}

export interface MeetingDepartment {
  id: string
  name: string
  status: 'completed' | 'in-progress' | 'pending'
}

export interface Meeting {
  id: string
  createdAt: Date
  customer: MeetingCustomer
  departments: MeetingDepartment[]
  meetingDate: Date
  isDone: boolean
}

export interface MeetingListProps {
  meetings: Meeting[]
  statusFilter: 'all' | 'done' | 'not-done'
  searchQuery: string
  onMarkDone: (meetingId: string) => void
  onPhoneClick: (meeting: Meeting) => void
  onMessageClick: (meeting: Meeting) => void
  onHistoryClick: (meeting: Meeting) => void
}

/**
 * Meeting list table matching the screenshot design.
 * Columns: CREATED | CUSTOMER | DEPARTMENT | MEETING DATE | ACTIONS
 */
export function MeetingList({
  meetings,
  statusFilter,
  searchQuery,
  onMarkDone,
  onPhoneClick,
  onMessageClick,
  onHistoryClick,
}: MeetingListProps) {
  const filteredMeetings = useMemo(() => {
    let result = meetings

    // Status filter
    if (statusFilter === 'done') {
      result = result.filter(m => m.isDone)
    } else if (statusFilter === 'not-done') {
      result = result.filter(m => !m.isDone)
    }

    // Search filter
    const term = searchQuery.trim().toLowerCase()
    if (term) {
      result = result.filter(m =>
        m.customer.name.toLowerCase().includes(term) ||
        m.customer.company.toLowerCase().includes(term) ||
        m.customer.email.toLowerCase().includes(term) ||
        m.customer.phone.includes(term)
      )
    }

    return result
  }, [meetings, statusFilter, searchQuery])

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, ' ')
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()
  }

  if (filteredMeetings.length === 0) {
    return (
      <motion.div
        className="meeting-list__empty"
        initial="hidden"
        animate="visible"
        variants={emptyVariants}
      >
        <Icon name="alert" size={32} strokeWidth={1.5} />
        <p>No meetings found</p>
      </motion.div>
    )
  }

  return (
    <div className="meeting-list__wrapper">
      <table className="meeting-list__table" role="grid">
        <thead>
          <tr>
            <th className="meeting-list__th meeting-list__th--created" scope="col">CREATED</th>
            <th className="meeting-list__th meeting-list__th--customer" scope="col">CUSTOMER</th>
            <th className="meeting-list__th meeting-list__th--department" scope="col">DEPARTMENT</th>
            <th className="meeting-list__th meeting-list__th--date" scope="col">MEETING DATE</th>
            <th className="meeting-list__th meeting-list__th--actions" scope="col">ACTIONS</th>
          </tr>
        </thead>
        <motion.tbody
          initial="hidden"
          animate="visible"
          variants={tbodyVariants}
        >
          {filteredMeetings.map(meeting => (
            <motion.tr
              key={meeting.id}
              className="meeting-list__row"
              variants={rowVariants}
            >
              <td className="meeting-list__td meeting-list__td--created">
                <div className="meeting-list__date-row">
                  <span className="meeting-list__date-label">{formatDate(meeting.createdAt)}</span>
                  <span className="meeting-list__time-label">{formatTime(meeting.createdAt)}</span>
                </div>
              </td>
              <td className="meeting-list__td meeting-list__td--customer">
                <div className="meeting-list__customer-cell">
                  <div className="meeting-list__customer-name">{meeting.customer.name}</div>
                  <div className="meeting-list__customer-company">{meeting.customer.company}</div>
                  <div className="meeting-list__customer-contact">
                    {meeting.customer.phone} · {meeting.customer.email}
                  </div>
                </div>
              </td>
              <td className="meeting-list__td meeting-list__td--department">
                <div className="meeting-list__department-pills">
                  {meeting.departments.map(dept => (
                    <DepartmentPill key={dept.id} department={dept} />
                  ))}
                </div>
              </td>
              <td className="meeting-list__td meeting-list__td--date">
                <div className="meeting-list__date-row">
                  <span className="meeting-list__date-label">{formatDate(meeting.meetingDate)}</span>
                  <span className="meeting-list__time-label">{formatTime(meeting.meetingDate)}</span>
                </div>
              </td>
              <td className="meeting-list__td meeting-list__td--actions">
                <div className="meeting-list__actions">
                  <Button
                    variant="primary"
                    className="meeting-list__done-btn"
                    onClick={() => onMarkDone(meeting.id)}
                    disabled={meeting.isDone}
                  >
                    <Icon name="check" size={14} strokeWidth={2.5} />
                    <span>{meeting.isDone ? 'Done' : 'Mark Done'}</span>
                  </Button>
                  <IconButton
                    icon="phone"
                    label="Call customer"
                    size={28}
                    iconSize={14}
                    variant="outline"
                    onClick={() => onPhoneClick(meeting)}
                  />
                  <IconButton
                    icon="mail"
                    label="Message customer"
                    size={28}
                    iconSize={14}
                    variant="outline"
                    onClick={() => onMessageClick(meeting)}
                  />
                  <IconButton
                    icon="history"
                    label="View history"
                    size={28}
                    iconSize={14}
                    variant="outline"
                    onClick={() => onHistoryClick(meeting)}
                  />
                </div>
              </td>
            </motion.tr>
          ))}
        </motion.tbody>
      </table>
    </div>
  )
}

interface DepartmentPillProps {
  department: MeetingDepartment
}

function DepartmentPill({ department }: DepartmentPillProps) {
  const toneMap: Record<MeetingDepartment['status'], 'success' | 'info' | 'warning'> = {
    completed: 'success',
    'in-progress': 'info',
    pending: 'warning',
  }

  const iconMap: Record<MeetingDepartment['status'], IconName> = {
    completed: 'check',
    'in-progress': 'clock',
    pending: 'hourglass',
  }

  return (
    <Pill
      tone={toneMap[department.status]}
      size="sm"
      className="meeting-list__dept-pill"
    >
      <Icon name={iconMap[department.status]} size={12} strokeWidth={2.5} />
      <span>{department.name}</span>
    </Pill>
  )
}