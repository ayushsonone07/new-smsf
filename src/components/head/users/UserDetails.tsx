import { motion, type Variants } from 'framer-motion'
import { ROLE_META } from './roleMeta'
import type { DepartmentUser } from '../../../features/departments/head/types/head.types'

interface UserDetailsProps {
  user: DepartmentUser
}

const detailVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
}

const detailItemVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18 } },
}

/** Key/value summary shown when a user row is expanded. */
export function UserDetails({ user }: UserDetailsProps) {
  const rows: { label: string; value: string }[] = [
    { label: 'Role', value: ROLE_META[user.role].label },
    { label: 'Joined', value: user.joinedLabel },
    { label: 'Monthly target', value: String(user.target) },
    { label: 'Achieved', value: `${user.achievedPercent}%` },
    {
      label: 'Attendance',
      value: `${user.presentDays} present · ${user.absentDays} absent`,
    },
    {
      label: 'Today',
      value: user.isPresentToday ? 'Present' : 'Absent',
    },
  ]

  return (
    <motion.div
      className="user-details"
      initial="hidden"
      animate="visible"
      variants={detailVariants}
    >
      {rows.map((row) => (
        <motion.div key={row.label} variants={detailItemVariants}>
          <span>{row.label}</span>
          <strong>{row.value}</strong>
        </motion.div>
      ))}
    </motion.div>
  )
}
