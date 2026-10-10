import { motion, type Variants } from 'framer-motion'
import { DashboardStatCard } from './DashboardStatCard'
import heroImg from '../../../assets/hero.png'

const statsGridVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
}

const heroVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export interface DashboardStatsData {
  totalCustomers: { value: string; growth: string; sub: string }
  onboarded: { value: string; sub: string }
  completed: { value: string; growth: string; sub: string }
  inProgress: { value: string; sub: string }
  pending: { value: string; sub: string }
  delayed: { value: string; growth: string; sub: string }
  presentUsers: { value: string; sub: string }
  absentUsers: { value: string; sub: string }
}

const DEFAULT_STATS: DashboardStatsData = {
  totalCustomers: { value: '0', growth: '', sub: 'Total customers' },
  onboarded: { value: '0', sub: '0% of all customers' },
  completed: { value: '0', growth: '', sub: 'Completed' },
  inProgress: { value: '0', sub: 'Currently processing' },
  pending: { value: '0', sub: 'Awaiting processing' },
  delayed: { value: '0', growth: '', sub: 'Needs follow-up' },
  presentUsers: { value: '0', sub: 'Active today' },
  absentUsers: { value: '0', sub: 'Not active today' },
}

export interface DashboardStatCardsProps {
  stats?: Partial<DashboardStatsData>
  /** Card titles for the last two cards (personal dashboards use days). */
  attendanceLabels?: { present: string; absent: string }
}

/**
 * Top Stat Cards Grid (8 Cards + Hero Illustration Card).
 * Exactly matches the reference layout.
 */
export function DashboardStatCards({
  stats = DEFAULT_STATS,
  attendanceLabels = { present: 'Present Users', absent: 'Absent Users' },
}: DashboardStatCardsProps) {
  const data = { ...DEFAULT_STATS, ...stats }

  return (
    <div className="hdb-stats-layout">
      <motion.div
        className="hdb-stats-grid"
        initial="hidden"
        animate="visible"
        variants={statsGridVariants}
      >
        {/* Row 1 */}
        <DashboardStatCard
          label="Total Customers"
          value={data.totalCustomers.value}
          pillText={data.totalCustomers.growth}
          pillTone="green"
          subtext={data.totalCustomers.sub}
          iconName="users"
          iconTone="blue"
        />

        <DashboardStatCard
          label="Onboarded"
          value={data.onboarded.value}
          subtext={data.onboarded.sub}
          iconName="check"
          iconTone="green"
        />

        <DashboardStatCard
          label="Completed"
          value={data.completed.value}
          pillText={data.completed.growth}
          pillTone="green"
          subtext={data.completed.sub}
          iconName="done"
          iconTone="purple"
        />

        <DashboardStatCard
          label="In Progress"
          value={data.inProgress.value}
          subtext={data.inProgress.sub}
          iconName="progress"
          iconTone="indigo"
        />

        {/* Row 2 */}
        <DashboardStatCard
          label="Pending"
          value={data.pending.value}
          valueColor="amber"
          subtext={data.pending.sub}
          iconName="hourglass"
          iconTone="yellow"
        />

        <DashboardStatCard
          label="Delayed"
          value={data.delayed.value}
          valueColor="red"
          pillText={data.delayed.growth}
          pillTone="gray"
          subtext={data.delayed.sub}
          iconName="alert"
          iconTone="red"
        />

        <DashboardStatCard
          label={attendanceLabels.present}
          value={data.presentUsers.value}
          subtext={data.presentUsers.sub}
          iconName="userPlus"
          iconTone="teal"
        />

        <DashboardStatCard
          label={attendanceLabels.absent}
          value={data.absentUsers.value}
          subtext={data.absentUsers.sub}
          iconName="userOut"
          iconTone="gray"
        />
      </motion.div>

      {/* Hero 3D Illustration Card */}
      <motion.div
        className="hdb-hero-card"
        initial="hidden"
        animate="visible"
        variants={heroVariants}
      >
        <img
          src={heroImg}
          alt="Team performance illustration"
          loading="eager"
        />
      </motion.div>
    </div>
  )
}
