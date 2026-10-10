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
import { useAuthOnboardingSummary } from '../../hooks/useAuthOnboardingSummary'
import type { OnboardingSummaryParams, AuthOnboardingSummaryParams } from '../../../../api/onboarding-dashboard.api'

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

/** Convert local date to ISO datetime string (start of day: 00:00:00). */
function toStartOfDayIso(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 19) // "2026-10-10T00:00:00"
}

/** Convert local date to ISO datetime string (end of day: 23:59:59). */
function toEndOfDayIso(date: Date): string {
  const d = new Date(date)
  d.setHours(23, 59, 59, 0)
  return d.toISOString().slice(0, 19) // "2026-10-10T23:59:59"
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

/** Range with ISO datetime for `/api/auth/onboarding/summary`. */
function rangeForAuth(period: string): {
  startDate?: string
  endDate?: string
  allTime?: boolean
} {
  const today = new Date()

  switch (period) {
    case 'Yesterday': {
      const yesterday = shiftDays(today, -1)
      return {
        startDate: toStartOfDayIso(yesterday),
        endDate: toEndOfDayIso(yesterday),
      }
    }
    case 'Last 7 days':
    case 'Custom range': {
      const start = shiftDays(today, -6)
      return {
        startDate: toStartOfDayIso(start),
        endDate: toEndOfDayIso(today),
      }
    }
    case 'This month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      return {
        startDate: toStartOfDayIso(start),
        endDate: toEndOfDayIso(today),
      }
    }
    case 'All time':
      return { allTime: true }
    default: // Today
      return {
        startDate: toStartOfDayIso(today),
        endDate: toEndOfDayIso(today),
      }
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
  const authRange = useMemo(() => rangeForAuth(datePeriod), [datePeriod])

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

  // Additional call to /api/auth/onboarding/summary with ISO datetime
  const authSummaryParams: AuthOnboardingSummaryParams = useMemo(
    () => ({
      department: 'ONBOARDING_DEPARTMENT',
      startDate: authRange.startDate,
      endDate: authRange.endDate,
      allTime: authRange.allTime,
    }),
    [authRange],
  )

  const authSummaryQuery = useAuthOnboardingSummary(authSummaryParams)

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

  function handleRefresh() {
    setRefreshKey((k) => k + 1)
    summaryQuery.refetch()
    membersQuery.refetch()
    assigningUsersQuery.refetch()
    authSummaryQuery.refetch()
  }

  const authKpis = authSummaryQuery.data

  // Merge KPIs from both APIs, preferring auth summary when available
  const mergedKpis = {
    totalCustomers: authKpis?.totalCustomers ?? summaryQuery.data?.kpis?.totalCustomers ?? 0,
    totalOnboarded: authKpis?.totalOnboardedCustomers ?? summaryQuery.data?.kpis?.totalOnboarded ?? 0,
    totalCompleted: authKpis?.totalCompletedOnboarding ?? summaryQuery.data?.kpis?.totalCompleted ?? 0,
    totalInProgress: authKpis?.totalInProgressOnboarding ?? summaryQuery.data?.kpis?.totalInProgress ?? 0,
    totalPending: authKpis?.totalPendingOnboarding ?? summaryQuery.data?.kpis?.totalPending ?? 0,
    totalDelayed: authKpis?.totalOnboardingTimeExceedingCustomers ?? summaryQuery.data?.kpis?.totalDelayed ?? 0,
    presentUsers: authKpis?.presentUsers ?? summaryQuery.data?.kpis?.presentUsers ?? 0,
    absentUsers: authKpis?.absentUsers ?? summaryQuery.data?.kpis?.absentUsers ?? 0,
  }

  const statsData: Partial<DashboardStatsData> | undefined = mergedKpis
    ? {
        totalCustomers: {
          value: num(mergedKpis.totalCustomers),
          growth: '▲ 4.7%',
          sub: '+45 this period',
        },
        onboarded: {
          value: num(mergedKpis.totalOnboarded),
          sub: `${Math.round(
            (mergedKpis.totalOnboarded / (mergedKpis.totalCustomers || 1)) * 100,
          )}% of all customers`,
        },
        completed: {
          value: num(mergedKpis.totalCompleted),
          growth: '▲ 13.8%',
          sub: 'vs last period',
        },
        inProgress: {
          value: num(mergedKpis.totalInProgress),
          sub: 'Currently processing',
        },
        pending: {
          value: num(mergedKpis.totalPending),
          sub: 'Awaiting processing',
        },
        delayed: {
          value: num(mergedKpis.totalDelayed),
          growth: '▲ 0%',
          sub: 'vs last period',
        },
        presentUsers: {
          value: num(mergedKpis.presentUsers),
          sub: 'Active today',
        },
        absentUsers: {
          value: num(mergedKpis.absentUsers),
          sub: 'Not active today',
        },
      }
    : undefined

  const teamMembers = useMemo<TeamMemberPerformance[]>(() => {
    const list = membersQuery.data?.teamMembers
    // Also consider auth summary team members
    const authMembers = authSummaryQuery.data?.teamMembers
    const sourceList = (list && list.length > 0) ? list : (authMembers && authMembers.length > 0 ? authMembers : null)
    
    if (sourceList) {
      return sourceList.map((m) => {
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
    return MOCK_TEAM_MEMBERS
  }, [membersQuery.data?.teamMembers, authSummaryQuery.data?.teamMembers])

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

  // Use auth summary for delay breakdown and team target
  const delayBreakdown = authSummaryQuery.data?.delayBreakdown ?? summaryQuery.data?.delayBreakdown
  const totalDelayed =
    authSummaryQuery.data?.totalOnboardingTimeExceedingCustomers ??
    summaryQuery.data?.totalDelayed ??
    mergedKpis?.totalDelayed ??
    9

  const teamTarget = authSummaryQuery.data?.teamTarget ?? summaryQuery.data?.teamTarget

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
              mergedKpis?.totalCustomers ??
              summaryQuery.data?.trend?.newCustomers?.reduce(
                (a, b) => a + b,
                0,
              )
            }
          />
          <TeamTargetAchievement
            percentage={teamTarget?.percentage}
            target={teamTarget?.target}
            achieved={teamTarget?.achieved}
            remaining={teamTarget?.remaining}
          />
        </div>
      </motion.div>

      {/* 4. Middle Row 2: Status Breakdown, Most Active Day & Delay Donut */}
      <motion.div variants={sectionVariants}>
        <div className="hdb-row-three-col">
          <StatusBreakdown
            pendingCount={
              authSummaryQuery.data?.totalPendingOnboarding ??
              summaryQuery.data?.statusBreakdown?.pending?.count ??
              mergedKpis?.totalPending
            }
            pendingPercent={
              summaryQuery.data?.statusBreakdown?.pending?.percentage
            }
            inProgressCount={
              authSummaryQuery.data?.totalInProgressOnboarding ??
              summaryQuery.data?.statusBreakdown?.inProgress?.count ??
              mergedKpis?.totalInProgress
            }
            inProgressPercent={
              summaryQuery.data?.statusBreakdown?.inProgress?.percentage
            }
            completedCount={
              authSummaryQuery.data?.totalCompletedOnboarding ??
              summaryQuery.data?.statusBreakdown?.completed?.count ??
              mergedKpis?.totalCompleted
            }
            completedPercent={
              summaryQuery.data?.statusBreakdown?.completed?.percentage
            }
            delayedCount={
              authSummaryQuery.data?.totalOnboardingTimeExceedingCustomers ??
              summaryQuery.data?.statusBreakdown?.delayed?.count ??
              mergedKpis?.totalDelayed
            }
            delayedPercent={
              summaryQuery.data?.statusBreakdown?.delayed?.percentage
            }
          />
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
