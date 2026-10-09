import { useState, useMemo } from 'react'
import { motion, type Variants } from 'framer-motion'
import { DashboardHeader } from '../../../../components/head/dashboard/DashboardHeader'
import {
  DashboardStatCards,
  type DashboardStatsData,
} from '../../../../components/head/dashboard/DashboardStatCards'
import { OnboardingTrend } from '../../../../components/head/dashboard/OnboardingTrend'
import { TeamTargetAchievement } from '../../../../components/head/dashboard/TeamTargetAchievement'
import { StatusBreakdown } from '../../../../components/head/dashboard/StatusBreakdown'
import { MostActiveDay } from '../../../../components/head/dashboard/MostActiveDay'
import { DelayWhoseSide } from '../../../../components/head/dashboard/DelayWhoseSide'
import {
  TeamTargetPerformance,
  type TeamMemberPerformance,
} from '../../../../components/head/dashboard/TeamTargetPerformance'
import { LinedUpMeetings } from '../../../../components/head/dashboard/LinedUpMeetings'
import { PerformanceOverview } from '../../../../components/head/dashboard/PerformanceOverview'
import {
  TopPerformers,
  type TopPerformerItem,
} from '../../../../components/head/dashboard/TopPerformers'
import { MemberDetailsModal } from '../../../../components/head/dashboard/MemberDetailsModal'
import '../../../../components/head/dashboard/Dashboard.css'
import { getSession } from '../../../../app/auth/session'
import { UserDashboardPage } from './UserDashboardPage'
import { useOnboardingDashboardSummary } from '../../hooks/useOnboardingDashboardSummary'
import { useOnboardingDashboardMembers } from '../../hooks/useOnboardingDashboardMembers'
import { useAssigningUsers } from '../../hooks/useAssigningUsers'
import { LoadingState } from '../../../../components/ui/LoadingState'
import { ErrorState } from '../../../../components/ui/ErrorState'
import type { OnboardingSummaryParams } from '../../../../api/onboarding-dashboard.api'
import { useDepartmentColumnPermissions } from '../../../permissions/hooks/useDepartmentColumnPermissions'

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}



function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function shiftDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function rangeFor(period: string): {
  startDate?: string
  endDate?: string
  allTime?: boolean
} {
  const today = new Date()
  const end = toIsoDate(today)

  switch (period) {
    case 'Yesterday': {
      const yesterday = toIsoDate(shiftDays(today, -1))
      return { startDate: yesterday, endDate: yesterday }
    }
    case 'Last 7 days':
    case 'Custom range':
      return {
        startDate: toIsoDate(shiftDays(today, -6)),
        endDate: end,
      }
    case 'This month':
      return {
        startDate: toIsoDate(
          new Date(today.getFullYear(), today.getMonth(), 1),
        ),
        endDate: end,
      }
    case 'All time':
      return { allTime: true }
    default:
      return { startDate: end, endDate: end }
  }
}

function num(value: number | undefined): string {
  return (value ?? 0).toLocaleString('en-US')
}

export function DashboardPage() {
  return getSession()?.user.role === 'USER' ? (
    <UserDashboardPage />
  ) : (
    <HeadDashboard />
  )
}

function HeadDashboard() {
  const [selectedMember, setSelectedMember] =
    useState<TeamMemberPerformance | null>(null)
  const [datePeriod, setDatePeriod] = useState('Today')
  const [refreshKey, setRefreshKey] = useState(0)

  const range = useMemo(() => rangeFor(datePeriod), [datePeriod])

  const summaryParams: OnboardingSummaryParams = useMemo(
    () => ({
      department: 'ONBOARDING_DEPARTMENT',
      startDate: range.startDate,
      endDate: range.endDate,
      allTime: range.allTime,
    }),
    [range],
  )

  const summaryQuery = useOnboardingDashboardSummary(summaryParams)

  const membersParams = useMemo(
    () => ({
      department: 'ONBOARDING_DEPARTMENT',
      page: 0,
      size: 10,
      startDate: range.startDate,
      endDate: range.endDate,
      allTime: range.allTime,
    }),
    [range],
  )

  const membersQuery = useOnboardingDashboardMembers(membersParams)
  const assigningUsersQuery = useAssigningUsers('ONBOARDING_DEPARTMENT')
  const { isColumnEnabled, refetch: refetchPermissions } =
    useDepartmentColumnPermissions('ONBOARDING_DEPARTMENT')

  const isStatusVisible = isColumnEnabled('Status')

  const teamMembers = useMemo<TeamMemberPerformance[]>(() => {
    const list = membersQuery.data?.teamMembers
    if (list && list.length > 0) {
      return list.map((m) => {
        const target = m.target ?? 0
        const completed = m.completed ?? 0
        const isPresent =
          m.attendance === 'Present' || (m.presentDays ?? 0) > 0

        return {
          id: String(m.userId),
          name: m.name || m.email,
          email: m.email,
          allTimeCustomers: m.allTimeCustomers ?? 0,
          attendance: isPresent ? 'Present' : 'Absent',
          presentDays: m.presentDays ?? (isPresent ? 1 : 0),
          absentDays: m.absentDays ?? (isPresent ? 0 : 1),
          assigned: m.assigned ?? 0,
          completed,
          delayed: m.delayed ?? 0,
          target,
          achievedPercent: Math.round(
            m.achievedPercentage ??
              (target > 0 ? (completed / target) * 100 : 100),
          ),
        }
      })
    }
    return []
  }, [membersQuery.data?.teamMembers])

  const topPerformers = useMemo<TopPerformerItem[]>(() => {
    const sorted = [...teamMembers].sort(
      (a, b) => b.completed - a.completed,
    )
    return sorted.slice(0, 3).map((item, idx) => ({
      rank: (idx + 1) as 1 | 2 | 3,
      name: item.name,
      score: item.completed,
    }))
  }, [teamMembers])

  function handleRefresh() {
    setRefreshKey((k) => k + 1)
    summaryQuery.refetch()
    membersQuery.refetch()
    assigningUsersQuery.refetch()
    refetchPermissions()
  }

  if (summaryQuery.isPending || membersQuery.isPending) {
    return <LoadingState message="Loading dashboard..." />
  }

  if (summaryQuery.isError) {
    return (
      <ErrorState
        title="Unable to load dashboard"
        message={summaryQuery.error.message}
        onRetry={handleRefresh}
      />
    )
  }

  const kpis = summaryQuery.data?.kpis
  const statsData: Partial<DashboardStatsData> = {
    totalCustomers: {
      value: num(kpis?.totalCustomers ?? 0),
      growth: '',
      sub: `${num(kpis?.totalCustomers ?? 0)} total customers`,
    },
    onboarded: {
      value: num(kpis?.totalOnboarded ?? 0),
      sub: `${Math.round(
        ((kpis?.totalOnboarded ?? 0) / (kpis?.totalCustomers || 1)) * 100,
      )}% of all customers`,
    },
    completed: {
      value: num(kpis?.totalCompleted ?? 0),
      growth: '',
      sub: 'Completed customers',
    },
    inProgress: {
      value: num(kpis?.totalInProgress ?? 0),
      sub: 'Currently processing',
    },
    pending: {
      value: num(kpis?.totalPending ?? 0),
      sub: 'Awaiting processing',
    },
    delayed: {
      value: num(kpis?.totalDelayed ?? 0),
      growth: '',
      sub: 'Needs follow-up',
    },
    presentUsers: {
      value: num(kpis?.presentUsers ?? 0),
      sub: 'Active today',
    },
    absentUsers: {
      value: num(kpis?.absentUsers ?? 0),
      sub: 'Not active today',
    },
  }

  const activeDays = summaryQuery.data?.mostActiveDay?.map((d) => ({
    day: d.day,
    value: d.count,
    isActive: d.count > 0,
  }))

  const delayBreakdown = summaryQuery.data?.delayBreakdown
  const totalDelayed =
    summaryQuery.data?.totalDelayed ?? kpis?.totalDelayed ?? 0

  return (
    <motion.div
      className="hdb-container"
      key={refreshKey}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* 1. Top Blue Welcome Header */}
      <motion.div variants={sectionVariants}>
        <DashboardHeader
          datePeriod={datePeriod}
          onDatePeriodChange={setDatePeriod}
          onRefresh={handleRefresh}
        />
      </motion.div>

      {/* 2. Top Stats Grid (8 Cards + 3D Hero Illustration) */}
      <motion.div variants={sectionVariants}>
        <DashboardStatCards stats={statsData} />
      </motion.div>

      {/* 3. Middle Row 1: Onboarding Trend & Team Target Achievement */}
      <motion.div variants={sectionVariants}>
        <div className="hdb-row-two-col">
          <OnboardingTrend
            total={
              kpis?.totalCustomers ??
              summaryQuery.data?.trend?.newCustomers?.reduce(
                (a, b) => a + b,
                0,
              )
            }
          />
          <TeamTargetAchievement
            percentage={summaryQuery.data?.teamTarget?.percentage}
            target={summaryQuery.data?.teamTarget?.target}
            achieved={summaryQuery.data?.teamTarget?.achieved}
            remaining={summaryQuery.data?.teamTarget?.remaining}
          />
        </div>
      </motion.div>

      {/* 4. Middle Row 2: Status Breakdown, Most Active Day & Delay Donut */}
      <motion.div variants={sectionVariants}>
        <div className={isStatusVisible ? 'hdb-row-three-col' : 'hdb-row-two-col-equal'}>
          {isStatusVisible && (
            <StatusBreakdown
              pendingCount={
                summaryQuery.data?.statusBreakdown?.pending?.count ??
                kpis?.totalPending
              }
              pendingPercent={
                summaryQuery.data?.statusBreakdown?.pending?.percentage
              }
              inProgressCount={
                summaryQuery.data?.statusBreakdown?.inProgress?.count ??
                kpis?.totalInProgress
              }
              inProgressPercent={
                summaryQuery.data?.statusBreakdown?.inProgress?.percentage
              }
              completedCount={
                summaryQuery.data?.statusBreakdown?.completed?.count ??
                kpis?.totalCompleted
              }
              completedPercent={
                summaryQuery.data?.statusBreakdown?.completed?.percentage
              }
              delayedCount={
                summaryQuery.data?.statusBreakdown?.delayed?.count ??
                kpis?.totalDelayed
              }
              delayedPercent={
                summaryQuery.data?.statusBreakdown?.delayed?.percentage
              }
            />
          )}
          <MostActiveDay days={activeDays} />
          <DelayWhoseSide
            totalDelayed={totalDelayed}
            clientCount={delayBreakdown?.clientSide?.count}
            clientPercent={delayBreakdown?.clientSide?.percentage}
            ourSideCount={delayBreakdown?.ourSide?.count}
            ourSidePercent={delayBreakdown?.ourSide?.percentage}
            techCount={delayBreakdown?.techOtherDepartment?.count}
            techPercent={delayBreakdown?.techOtherDepartment?.percentage}
          />
        </div>
      </motion.div>

      {/* 5. Team Target & Performance Full Table */}
      <motion.div variants={sectionVariants}>
        <TeamTargetPerformance
          members={teamMembers}
          onSelectMember={setSelectedMember}
          onRefresh={handleRefresh}
        />
      </motion.div>

      {/* 6. Lined-up Meetings Grid */}
      <motion.div variants={sectionVariants}>
        <LinedUpMeetings />
      </motion.div>

      {/* 7. Bottom Row: Performance Overview & Top Performers */}
      <motion.div variants={sectionVariants}>
        <div className="hdb-row-bottom">
          <PerformanceOverview />
          <TopPerformers performers={topPerformers} />
        </div>
      </motion.div>

      {/* 8. Member Details Modal */}
      <MemberDetailsModal
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
      />
    </motion.div>
  )
}
