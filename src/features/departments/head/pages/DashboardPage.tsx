import { useCallback, useMemo, useState } from 'react'
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
import {
  MemberDetailsModal,
  type MemberWorkItem,
} from '../../../../components/head/dashboard/MemberDetailsModal'
import '../../../../components/head/dashboard/Dashboard.css'
import { LoadingState } from '../../../../components/ui/LoadingState'
import { ErrorState } from '../../../../components/ui/ErrorState'
import { useDepartmentColumnPermissions } from '../../../permissions/hooks/useDepartmentColumnPermissions'
import { getSession } from '../../../../app/auth/session'
import { resolveDeptFromPath } from '../utils/routeUtils'
import { UserDashboardPage } from './UserDashboardPage'
import { RecurringDashboardPage } from './RecurringDashboardPage'
import { useOnboardingDashboardSummary } from '../../hooks/useOnboardingDashboardSummary'
import { useInfiniteOnboardingDashboardMembers } from '../../hooks/useOnboardingDashboardMembers'
import { useMemberDetails } from '../../hooks/useMemberDetails'
import {
  type OnboardingSummaryParams,
} from '../../../../api/onboarding-dashboard.api'
import {
  Globe,
  Bot,
  Layers,
} from 'lucide-react'

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

function rangeFor(period: string, customRange?: { from: string; to: string }): {
  startDate?: string
  endDate?: string
  allTime?: boolean
} {
  const today = new Date()
  const end = toIsoDate(today)

  switch (period) {
    case 'Last 7 days':
      return {
        startDate: toIsoDate(shiftDays(today, -6)),
        endDate: end,
      }
    case 'Custom range':
      return customRange?.from && customRange?.to
        ? { startDate: customRange.from, endDate: customRange.to }
        : { startDate: end, endDate: end }
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

function departmentLabel(departmentType: string): string {
  return departmentType
    .replace(/_DEPARTMENT$/i, '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) + ' Department'
}

const AUTOWEBSION_HEAD_TABS = [
  { key: 'AUTOWEBSION_DEPARTMENT', label: 'Autowebsion', icon: Layers },
  { key: 'AUTOMATION_DEPARTMENT', label: 'Automation', icon: Bot },
  { key: 'WEBSITE_DEPARTMENT', label: 'Website', icon: Globe },
] as const

function AutowebsionMergedHeadDashboard({ rawDepartment }: { rawDepartment: string }) {
  const session = getSession()
  const userDept = session?.user.departmentType || rawDepartment || 'AUTOWEBSION_DEPARTMENT'
  const ownDept =
    AUTOWEBSION_HEAD_TABS.find((t) => t.key.toUpperCase() === userDept.toUpperCase())?.key ||
    'AUTOWEBSION_DEPARTMENT'

  const [selectedDept, setSelectedDept] = useState<string>(ownDept)

  return (
    <div className="w-full min-h-full">
      {/* Scope Switcher Tabs: Autowebsion | Automation | Website */}
      <div className="px-6 pt-5 pb-0 max-w-7xl mx-auto">
        <div className="inline-flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200/80 shadow-xs">
          {AUTOWEBSION_HEAD_TABS.map((tab) => {
            const isSelected = selectedDept === tab.key
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedDept(tab.key)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Render HeadDashboard with key to force fresh API fetch per department */}
      <HeadDashboard key={selectedDept} overrideDepartment={selectedDept} />
    </div>
  )
}

export function DashboardPage() {
  const session = getSession()
  const deptFromUrl = typeof window !== 'undefined' ? resolveDeptFromPath(window.location.pathname) : null
  const rawDepartment = session?.user.departmentType || deptFromUrl || ''
  const isAutowebsion = Boolean(
    rawDepartment && (
      rawDepartment.toUpperCase().includes('AUTOWEB') ||
      rawDepartment.toUpperCase().includes('WEBSITE') ||
      rawDepartment.toUpperCase().includes('AUTOMATION')
    ) ||
    (typeof window !== 'undefined' && (
      window.location.pathname.includes('autoweb') ||
      window.location.pathname.includes('website') ||
      window.location.pathname.includes('automation')
    ))
  )

  if (session?.user.role === 'USER') {
    return <UserDashboardPage />
  }

  const isRecurring = Boolean(rawDepartment && rawDepartment.toUpperCase().includes('RECURRING')) || (typeof window !== 'undefined' && window.location.pathname.includes('recurring'))
  if (isRecurring) {
    return <RecurringDashboardPage />
  }
  if (isAutowebsion) {
    return <AutowebsionMergedHeadDashboard rawDepartment={rawDepartment} />
  }

  return <HeadDashboard />
}

function HeadDashboard({ overrideDepartment }: { overrideDepartment?: string } = {}) {
  const session = getSession()
  const deptFromUrl = typeof window !== 'undefined' ? resolveDeptFromPath(window.location.pathname) : null
  const rawDepartment = overrideDepartment || session?.user.departmentType || deptFromUrl || ''
  const isGoogle =
    rawDepartment.toUpperCase().includes('GOOGLE') ||
    (typeof window !== 'undefined' && (
      window.location.pathname.startsWith('/google-head') ||
      window.location.pathname.startsWith('/google')
    ))
  const currentDepartment = isGoogle ? 'GOOGLE_DEPARTMENT' : (rawDepartment || 'ONBOARDING_DEPARTMENT')

  const [selectedMember, setSelectedMember] =
    useState<TeamMemberPerformance | null>(null)
  const [datePeriod, setDatePeriod] = useState('Today')
  const [customRange, setCustomRange] = useState({ from: '', to: '' })
  const [refreshKey, setRefreshKey] = useState(0)
  const department = currentDepartment
  const memberReportRange = useMemo(() => rangeFor('Last 7 days'), [])
  const selectedMemberQuery = useMemberDetails({
    userId: selectedMember?.id ?? 0,
    department,
    startDate: memberReportRange.startDate
      ? `${memberReportRange.startDate}T00:00:00`
      : undefined,
    endDate: memberReportRange.endDate
      ? `${memberReportRange.endDate}T23:59:59`
      : undefined,
    page: 0,
    size: 500,
  })

  const selectedMemberWorkItems = useMemo<MemberWorkItem[]>(
    () =>
      (selectedMemberQuery.data?.customers ?? []).map((customer, index) => {
        const rawStatus = String(customer.status ?? 'PENDING').toUpperCase()
        const status: MemberWorkItem['status'] =
          rawStatus === 'COMPLETED'
            ? 'Completed'
            : rawStatus === 'IN_PROGRESS' || rawStatus === 'IN PROGRESS'
              ? 'In progress'
              : 'Pending'
        const rawDelaySide = String(customer.delaySide ?? '').toUpperCase()
        const delaySide: MemberWorkItem['delaySide'] =
          rawDelaySide === 'CLIENT' || rawDelaySide === 'OURS' || rawDelaySide === 'TECH'
            ? rawDelaySide
            : undefined

        return {
          id: String(customer.customerId ?? index),
          customerName:
            customer.customerName ||
            customer.ownerName ||
            `Customer #${customer.customerId ?? index + 1}`,
          contactAndCity: [
            customer.ownerName,
            customer.email,
            customer.phone,
            customer.city,
          ]
            .filter(Boolean)
            .join(' · '),
          status,
          delayDays: customer.delayDays ?? 0,
          delaySide,
          reason: customer.delayReason,
          remark: customer.remark || 'No remark added',
        }
      }),
    [selectedMemberQuery.data?.customers],
  )

  const range = useMemo(
    () => rangeFor(datePeriod, customRange),
    [datePeriod, customRange],
  )

  const summaryParams: OnboardingSummaryParams = useMemo(
    () => ({
      department,
      startDate: range.startDate,
      endDate: range.endDate,
      allTime: range.allTime,
    }),
    [range, currentDepartment],
  )

  const summaryQuery = useOnboardingDashboardSummary(summaryParams)

  const membersParams = useMemo(
    () => ({
      department: currentDepartment,
      size: 10,
      startDate: range.startDate,
      endDate: range.endDate,
      allTime: range.allTime,
    }),
    [range, department],
  )

  const infiniteMembersQuery = useInfiniteOnboardingDashboardMembers(membersParams)
  const {
    hasNextPage: membersHasNextPage,
    isFetchingNextPage: membersIsFetchingNextPage,
    fetchNextPage: fetchMoreMembers,
  } = infiniteMembersQuery
  const { refetch: refetchPermissions } =
    useDepartmentColumnPermissions(currentDepartment)

  const handleLoadMoreMembers = useCallback(() => {
    if (membersHasNextPage && !membersIsFetchingNextPage) {
      void fetchMoreMembers()
    }
  }, [membersHasNextPage, membersIsFetchingNextPage, fetchMoreMembers])

  function handleRefresh() {
    setRefreshKey((k) => k + 1)
    summaryQuery.refetch()
    infiniteMembersQuery.refetch()
    refetchPermissions()
  }

  // Team performance table refresh: reloads only the members list.
  function handleRefreshMembers() {
    return infiniteMembersQuery.refetch()
  }

  // Light "refreshing" state for sections fed by each query (initial load shows LoadingState).
  const summaryRefreshClass = summaryQuery.isFetching ? 'transition-opacity opacity-60 pointer-events-none' : 'transition-opacity'
  const membersRefreshClass =
    infiniteMembersQuery.isFetching && !infiniteMembersQuery.isFetchingNextPage
      ? 'transition-opacity opacity-60 pointer-events-none'
      : 'transition-opacity'

  // All dashboard totals and chart data come from the shared summary endpoint.
  const mergedKpis = {
    totalCustomers: summaryQuery.data?.kpis?.totalCustomers ?? 0,
    totalOnboarded: summaryQuery.data?.kpis?.totalOnboarded ?? 0,
    totalCompleted: summaryQuery.data?.kpis?.totalCompleted ?? 0,
    totalInProgress: summaryQuery.data?.kpis?.totalInProgress ?? 0,
    totalPending: summaryQuery.data?.kpis?.totalPending ?? 0,
    totalDelayed: summaryQuery.data?.kpis?.totalDelayed ?? 0,
    presentUsers: summaryQuery.data?.kpis?.presentUsers ?? 0,
    absentUsers: summaryQuery.data?.kpis?.absentUsers ?? 0,
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
    const rawPages = infiniteMembersQuery.data?.pages ?? []
    const allMembers: typeof rawPages[0]['teamMembers'] = []
    const seen = new Set<string>()

    for (const page of rawPages) {
      for (const m of page.teamMembers ?? []) {
        const key = String(m.userId ?? m.email ?? m.name)
        if (!seen.has(key)) {
          seen.add(key)
          allMembers.push(m)
        }
      }
    }

    const sourceList = allMembers.length > 0 ? allMembers : null

    if (sourceList) {
      return sourceList.map((m) => {
        const target = m.target ?? 0
        const completed = m.completed ?? 0
        const isPresent =
          m.attendance === 'Present' || (m.presentDays ?? 0) > 0

        return {
          id: String(m.userId ?? m.email ?? m.name),
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
  }, [infiniteMembersQuery.data])

  const totalMembers = infiniteMembersQuery.data?.pages?.[0]?.totalMembers

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

  if (summaryQuery.isPending || infiniteMembersQuery.isPending) {
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



  const activeDays = summaryQuery.data?.mostActiveDay?.map((d) => ({
    day: d.day,
    value: d.count,
    isActive: d.count > 0,
  }))

  const delayBreakdown = summaryQuery.data?.delayBreakdown
  const totalDelayed =
    summaryQuery.data?.totalDelayed ??
    mergedKpis?.totalDelayed

  const teamTarget = summaryQuery.data?.teamTarget
  const hasDelayBreakdown =
    delayBreakdown?.available !== false &&
    Boolean(
      delayBreakdown?.clientSide ||
      delayBreakdown?.ourSide ||
      delayBreakdown?.techOtherDepartment,
    )

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
          greetingName={departmentLabel(currentDepartment)}
          datePeriod={datePeriod}
          onDatePeriodChange={setDatePeriod}
          customDateFrom={customRange.from}
          customDateTo={customRange.to}
          onCustomDateRangeChange={(from, to) => setCustomRange({ from, to })}
          onRefresh={handleRefresh}
        />
      </motion.div>

      {/* 2. Top Stats Grid (8 Cards + 3D Hero Illustration) */}
      <motion.div variants={sectionVariants} className={summaryRefreshClass} aria-busy={summaryQuery.isFetching}>
        <DashboardStatCards stats={statsData} />
      </motion.div>

      {/* 3. Middle Row 1: Onboarding Trend & Team Target Achievement */}
      <motion.div variants={sectionVariants} className={summaryRefreshClass} aria-busy={summaryQuery.isFetching}>
        <div className="hdb-row-two-col">
          <OnboardingTrend
            total={
              mergedKpis?.totalCustomers ??
              summaryQuery.data?.trend?.newCustomers?.reduce(
                (a, b) => a + b,
                0,
              )
            }
            labels={summaryQuery.data?.trend?.labels}
            newCustomers={summaryQuery.data?.trend?.newCustomers}
            completed={summaryQuery.data?.trend?.completed}
            previousPeriod={summaryQuery.data?.trend?.previousPeriod}
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
      <motion.div variants={sectionVariants} className={summaryRefreshClass} aria-busy={summaryQuery.isFetching}>
        <div className="hdb-row-three-col">
          <StatusBreakdown
            pendingCount={
              summaryQuery.data?.statusBreakdown?.pending?.count ??
              mergedKpis?.totalPending
            }
            pendingPercent={
              summaryQuery.data?.statusBreakdown?.pending?.percentage
            }
            inProgressCount={
              summaryQuery.data?.statusBreakdown?.inProgress?.count ??
              mergedKpis?.totalInProgress
            }
            inProgressPercent={
              summaryQuery.data?.statusBreakdown?.inProgress?.percentage
            }
            completedCount={
              summaryQuery.data?.statusBreakdown?.completed?.count ??
              mergedKpis?.totalCompleted
            }
            completedPercent={
              summaryQuery.data?.statusBreakdown?.completed?.percentage
            }
            delayedCount={
              summaryQuery.data?.statusBreakdown?.delayed?.count ??
              mergedKpis?.totalDelayed
            }
            delayedPercent={
              summaryQuery.data?.statusBreakdown?.delayed?.percentage
            }
          />
          <MostActiveDay days={activeDays ?? []} />
          <DelayWhoseSide
            totalDelayed={totalDelayed}
            available={hasDelayBreakdown}
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
      <motion.div variants={sectionVariants} className={membersRefreshClass} aria-busy={infiniteMembersQuery.isFetching}>
        <TeamTargetPerformance
          members={teamMembers}
          onSelectMember={setSelectedMember}
          onRefresh={handleRefreshMembers}
          hasNextPage={Boolean(infiniteMembersQuery.hasNextPage)}
          isFetchingNextPage={Boolean(infiniteMembersQuery.isFetchingNextPage)}
          onLoadMore={handleLoadMoreMembers}
          totalMembers={totalMembers}
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
        workItems={selectedMemberWorkItems}
        isLoading={selectedMemberQuery.isLoading}
        onClose={() => setSelectedMember(null)}
      />
    </motion.div>
  )
}
