import type { ReactNode } from 'react'
import { motion, type Variants } from 'framer-motion'
import { Icon } from '../shared/Icon'
import type { IconName } from '../shared/iconPaths'

const statCardVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28 } },
}

export type StatIconTone =
  | 'blue'
  | 'green'
  | 'purple'
  | 'indigo'
  | 'yellow'
  | 'red'
  | 'teal'
  | 'gray'

export interface DashboardStatCardProps {
  label: string
  value: string | number
  valueColor?: 'default' | 'amber' | 'red'
  pillText?: string
  pillTone?: 'green' | 'gray'
  subtext: string
  iconName: IconName
  iconTone: StatIconTone
  customIcon?: ReactNode
}

/**
 * Single Stat KPI card for the Head Dashboard.
 */
export function DashboardStatCard({
  label,
  value,
  valueColor = 'default',
  pillText,
  pillTone = 'green',
  subtext,
  iconName,
  iconTone,
  customIcon,
}: DashboardStatCardProps) {
  const valueClass =
    valueColor === 'amber'
      ? 'hdb-stat-card__value hdb-stat-card__value--amber'
      : valueColor === 'red'
        ? 'hdb-stat-card__value hdb-stat-card__value--red'
        : 'hdb-stat-card__value'

  return (
    <motion.div className="hdb-stat-card" variants={statCardVariants}>
      <div className="hdb-stat-card__top">
        <span className="hdb-stat-card__label">{label}</span>
        <div className={`hdb-stat-card__icon hdb-stat-card__icon--${iconTone}`}>
          {customIcon || <Icon name={iconName} size={15} strokeWidth={2} />}
        </div>
      </div>

      <div>
        <div className="hdb-stat-card__body">
          <span className={valueClass}>{value}</span>
          {pillText && (
            <span
              className={`hdb-stat-card__pill hdb-stat-card__pill--${pillTone}`}
            >
              {pillText}
            </span>
          )}
        </div>
        <p className="hdb-stat-card__sub">{subtext}</p>
      </div>
    </motion.div>
  )
}
