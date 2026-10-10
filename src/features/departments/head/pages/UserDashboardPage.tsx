import { useMemo, useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import { getSession } from '../../../../app/auth/session'
import { useOnboardingDashboardSummary } from '../../hooks/useOnboardingDashboardSummary'
import { useOnboardingDashboardMembers } from '../../hooks/useOnboardingDashboardMembers'
import { DashboardHeader } from '../../../../components/head/dashboard/DashboardHeader'
import { DashboardStatCards } from '../../../../components/head/dashboard/DashboardStatCards'
import { OnboardingTrend } from '../../../../components/head/dashboard/OnboardingTrend'
import { TeamTargetAchievement } from '../../../../components/head/dashboard/TeamTargetAchievement'
import { StatusBreakdown } from '../../../../components/head/dashboard/StatusBreakdown'
import { MostActiveDay } from '../../../../components/head/dashboard/MostActiveDay'
import { DelayWhoseSide } from '../../../../components/head/dashboard/DelayWhoseSide'
import { LinedUpMeetings } from '../../../../components/head/dashboard/LinedUpMeetings'
import { LoadingState } from '../../../../components/ui/LoadingState'
import { ErrorState } from '../../../../components/ui/ErrorState'
import type { OnboardingSummaryKpis } from '../../types/onboarding-dashboard.types'
import { useDepartmentColumnPermissions } from '../../../permissions/hooks/useDepartmentColumnPermissions'
import '../../../../components/head/dashboard/Dashboard.css'

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

const EMPTY_KPIS: OnboardingSummaryKpis = {
  totalCustomers: 0,
  totalOnboarded: 0,
  totalCompleted: 0,
  totalInProgress: 0,
  totalPending: 0,
  totalDelayed: 0,
  presentUsers: 0,
  absentUsers: 0,
}

interface DateRange {
  startDate?: string
  endDate?: string
  allTime?: boolean
}

/** Local-timezone `YYYY-MM-DD` (UTC slicing would shift the day). */
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

/**
 * Period dropdown → `startDate` / `endDate` of the summary API.
 * "Custom range" has no date picker yet — it falls back to the
 * last 7 days.
 */
function rangeFor(period: string): DateRange {
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

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

function num(value: number | undefined): string {
  return (value ?? 0).toLocaleString('en-US')
}

/** "▲ 12.5%" pill, empty string hides the pill. */
function growthLabel(
  current: number,
  previous: number,
): string {
  if (!previous) return ''
  const pct = ((current - previous) / previous) * 100
  return `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}%`
}

function percent(part: number, total: number): string {
  if (!total) return '0%'
  return `${Math.round((part / total) * 100)}%`
}

/**
 * Personal dashboard of a logged-in department USER — the same
 * widgets as the head dashboard, but the counts come from
 * `GET /api/onboarding/dashboard/summary` which scopes every
 * number to the requesting user.
 */
export function UserDashboardPage() {
  const [datePeriod, setDatePeriod] = useState('Today')
  const [refreshKey, setRefreshKey] = useState(0)
  const name = getSession()?.user.name ?? 'there'

  const range = useMemo(
    () => rangeFor(datePeriod),
    [datePeriod],
  )
  const summaryParams = useMemo(
    () => ({
      department: 'ONBOARDING_DEPARTMENT',
      startDate: range.startDate,
      endDate: range.endDate,
      allTime: range.allTime,
    }),
    [range],
  )
  const query = useOnboardingDashboardSummary(summaryParams)

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
  const { isColumnEnabled, refetch: refetchPermissions } =
    useDepartmentColumnPermissions('ONBOARDING_DEPARTMENT')
  const isStatusVisible = isColumnEnabled('Status')

  if (query.isPending || membersQuery.isPending) {
    return (
      <LoadingState message="Loading your dashboard..." />
    )
  }

  if (query.isError) {
    return (
      <ErrorState
        title="Unable to load dashboard"
        message={query.error.message}
        onRetry={() => {
          void query.refetch()
          void membersQuery.refetch()
          void refetchPermissions()
        }}
      />
    )
  }

  const summary = query.data
  const kpis = summary?.kpis ?? EMPTY_KPIS
  const trend = summary?.trend
  const target = summary?.teamTarget
  const breakdown = summary?.statusBreakdown
  const delay = summary?.delayBreakdown

  const newTotal = sum(trend?.newCustomers ?? [])
  const previousTotal = sum(trend?.previousPeriod ?? [])
  const growth =
    growthLabel(newTotal, previousTotal) || '—'

  const activeDays = (summary?.mostActiveDay ?? []).map(
    (item) => ({ day: item.day, value: item.count }),
  )
  const busiestDay = activeDays.reduce(
    (best, item) =>
      item.value > best.value ? item : best,
    { day: '', value: -1 },
  )

  function handleRefresh() {
    void query.refetch()
    void membersQuery.refetch()
    setRefreshKey((key) => key + 1)
  }

  return (
    <motion.div
      className="hdb-container"
      key={refreshKey}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div variants={sectionVariants}>
        <DashboardHeader
          greetingName={name}
          datePeriod={datePeriod}
          onDatePeriodChange={setDatePeriod}
          onRefresh={handleRefresh}
          subtitle={
            summary.period?.caption ??
            summary.period?.label
          }
        />
      </motion.div>

      <motion.div variants={sectionVariants}>
        <DashboardStatCards
          stats={{
            totalCustomers: {
              value: num(kpis.totalCustomers),
              growth: growth === '—' ? '' : growth,
              sub: `${num(newTotal)} new this period`,
            },
            onboarded: {
              value: num(kpis.totalOnboarded),
              sub: `${percent(
                kpis.totalOnboarded,
                kpis.totalCustomers,
              )} of my customers`,
            },
            completed: {
              value: num(kpis.totalCompleted),
              growth: '',
              sub: 'Finished this period',
            },
            inProgress: {
              value: num(kpis.totalInProgress),
              sub: 'Currently processing',
            },
            pending: {
              value: num(kpis.totalPending),
              sub: 'Awaiting processing',
            },
            delayed: {
              value: num(kpis.totalDelayed),
              growth: '',
              sub: 'Needs follow-up',
            },
            presentUsers: {
              value: num(kpis.presentUsers),
              sub: 'This period',
            },
            absentUsers: {
              value: num(kpis.absentUsers),
              sub: 'This period',
            },
          }}
          attendanceLabels={{
            present: 'Present Days',
            absent: 'Absent Days',
          }}
        />
      </motion.div>

      <motion.div variants={sectionVariants}>
        <div className="hdb-row-two-col">
          <OnboardingTrend
            total={newTotal}
            growth={growth}
          />
          <TeamTargetAchievement
            title="My Target Achievement"
            percentage={target?.percentage ?? 0}
            target={target?.target ?? 0}
            achieved={target?.achieved ?? 0}
            remaining={target?.remaining ?? 0}
          />
        </div>
      </motion.div>

      <motion.div variants={sectionVariants}>
        <div className={isStatusVisible ? 'hdb-row-three-col' : 'hdb-row-two-col-equal'}>
          {isStatusVisible && (
            <StatusBreakdown
              pendingCount={breakdown?.pending?.count ?? 0}
              pendingPercent={Math.round(
                breakdown?.pending?.percentage ?? 0,
              )}
              inProgressCount={
                breakdown?.inProgress?.count ?? 0
              }
              inProgressPercent={Math.round(
                breakdown?.inProgress?.percentage ?? 0,
              )}
              completedCount={
                breakdown?.completed?.count ?? 0
              }
              completedPercent={Math.round(
                breakdown?.completed?.percentage ?? 0,
              )}
              delayedCount={breakdown?.delayed?.count ?? 0}
              delayedPercent={Math.round(
                breakdown?.delayed?.percentage ?? 0,
              )}
            />
          )}
          <MostActiveDay
            days={activeDays.map((item) => ({
              ...item,
              isActive: item.day === busiestDay.day,
            }))}
          />
          <DelayWhoseSide
            totalDelayed={summary.totalDelayed ?? 0}
            clientCount={delay?.clientSide?.count ?? 0}
            clientPercent={Math.round(
              delay?.clientSide?.percentage ?? 0,
            )}
            ourSideCount={delay?.ourSide?.count ?? 0}
            ourSidePercent={Math.round(
              delay?.ourSide?.percentage ?? 0,
            )}
            techCount={
              delay?.techOtherDepartment?.count ?? 0
            }
            techPercent={Math.round(
              delay?.techOtherDepartment?.percentage ??
                0,
            )}
          />
        </div>
      </motion.div>

      <motion.div variants={sectionVariants}>
        <LinedUpMeetings />
      </motion.div>
    </motion.div>
  )
}
