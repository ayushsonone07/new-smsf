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
  totalCustomers: { value: '6,972', growth: '▲ 4.7%', sub: '+45 this period' },
  onboarded: { value: '6,818', sub: '98% of all customers' },
  completed: { value: '33', growth: '▲ 13.8%', sub: 'vs 29 last period' },
  inProgress: { value: '7', sub: 'Currently processing' },
  pending: { value: '5', sub: 'Awaiting processing' },
  delayed: { value: '9', growth: '▲ 0%', sub: 'vs 9 last period' },
  presentUsers: { value: '6', sub: 'Active today' },
  absentUsers: { value: '2', sub: 'Not active today' },
}

export interface DashboardStatCardsProps {
  stats?: Partial<DashboardStatsData>
}

/**
 * Top Stat Cards Grid (8 Cards + Hero Illustration Card).
 * Exactly matches the reference layout.
 */
export function DashboardStatCards({ stats = DEFAULT_STATS }: DashboardStatCardsProps) {
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
          label="Present Users"
          value={data.presentUsers.value}
          subtext={data.presentUsers.sub}
          iconName="userPlus"
          iconTone="teal"
        />

        <DashboardStatCard
          label="Absent Users"
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
