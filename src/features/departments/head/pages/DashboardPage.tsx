import { useState } from 'react'
import { DashboardHeader } from '../../../../components/head/dashboard/DashboardHeader'
import { DashboardStatCards } from '../../../../components/head/dashboard/DashboardStatCards'
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
import { TopPerformers } from '../../../../components/head/dashboard/TopPerformers'
import { MemberDetailsModal } from '../../../../components/head/dashboard/MemberDetailsModal'
import '../../../../components/head/dashboard/Dashboard.css'

// ============================================================================
// TEMPORARY MOCK DATA
// Exactly matches the reference dashboard screenshots.
// ============================================================================

const MOCK_TEAM_MEMBERS: TeamMemberPerformance[] = [
  {
    id: 'u-1',
    name: 'Abhishek Sahu',
    email: 'abhishekmbg261@gmail.com',
    allTimeCustomers: 311,
    attendance: 'Present',
    presentDays: 1,
    absentDays: 0,
    assigned: 8,
    completed: 6,
    delayed: 2,
    target: 6,
    achievedPercent: 100,
  },
  {
    id: 'u-2',
    name: 'Mahima',
    email: 'mahimambg12@gmail.com',
    allTimeCustomers: 287,
    attendance: 'Present',
    presentDays: 1,
    absentDays: 0,
    assigned: 7,
    completed: 4,
    delayed: 1,
    target: 5,
    achievedPercent: 80,
  },
  {
    id: 'u-3',
    name: 'Mohit',
    email: 'mohitmbgcard19@gmail.com',
    allTimeCustomers: 240,
    attendance: 'Present',
    presentDays: 1,
    absentDays: 0,
    assigned: 6,
    completed: 4,
    delayed: 1,
    target: 5,
    achievedPercent: 80,
  },
  {
    id: 'u-4',
    name: 'Bhupinder',
    email: 'bhupinder.mbg@gmail.com',
    allTimeCustomers: 198,
    attendance: 'Absent',
    presentDays: 0,
    absentDays: 1,
    assigned: 6,
    completed: 5,
    delayed: 1,
    target: 5,
    achievedPercent: 100,
  },
  {
    id: 'u-5',
    name: 'Gungun',
    email: 'gungunmbg@gmail.com',
    allTimeCustomers: 176,
    attendance: 'Present',
    presentDays: 1,
    absentDays: 0,
    assigned: 5,
    completed: 4,
    delayed: 1,
    target: 4,
    achievedPercent: 100,
  },
  {
    id: 'u-6',
    name: 'Afreen',
    email: 'sheikhafreenmbg786@gmail.com',
    allTimeCustomers: 150,
    attendance: 'Present',
    presentDays: 1,
    absentDays: 0,
    assigned: 5,
    completed: 4,
    delayed: 1,
    target: 4,
    achievedPercent: 100,
  },
  {
    id: 'u-7',
    name: 'Ayushi',
    email: 'ayushimbg@gmail.com',
    allTimeCustomers: 122,
    attendance: 'Absent',
    presentDays: 0,
    absentDays: 1,
    assigned: 5,
    completed: 3,
    delayed: 1,
    target: 4,
    achievedPercent: 75,
  },
  {
    id: 'u-8',
    name: 'Nikita',
    email: 'nikitambg@gmail.com',
    allTimeCustomers: 96,
    attendance: 'Present',
    presentDays: 1,
    absentDays: 0,
    assigned: 4,
    completed: 3,
    delayed: 1,
    target: 3,
    achievedPercent: 100,
  },
]

/**
 * Head Onboarding Dashboard Page.
 * Composes all the reusable dashboard widgets matching the reference screenshots.
 */
export function DashboardPage() {
  const [selectedMember, setSelectedMember] =
    useState<TeamMemberPerformance | null>(null)
  const [datePeriod, setDatePeriod] = useState('Today')
  const [refreshKey, setRefreshKey] = useState(0)

  function handleRefresh() {
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="hdb-container" key={refreshKey}>
      {/* 1. Top Blue Welcome Header */}
      <DashboardHeader
        datePeriod={datePeriod}
        onDatePeriodChange={setDatePeriod}
        onRefresh={handleRefresh}
      />

      {/* 2. Top Stats Grid (8 Cards + 3D Hero Illustration) */}
      <DashboardStatCards />

      {/* 3. Middle Row 1: Onboarding Trend & Team Target Achievement */}
      <div className="hdb-row-two-col">
        <OnboardingTrend />
        <TeamTargetAchievement />
      </div>

      {/* 4. Middle Row 2: Status Breakdown, Most Active Day & Delay Donut */}
      <div className="hdb-row-three-col">
        <StatusBreakdown />
        <MostActiveDay />
        <DelayWhoseSide />
      </div>

      {/* 5. Team Target & Performance Full Table */}
      <TeamTargetPerformance
        members={MOCK_TEAM_MEMBERS}
        onSelectMember={setSelectedMember}
        onRefresh={handleRefresh}
      />

      {/* 6. Lined-up Meetings Grid */}
      <LinedUpMeetings />

      {/* 7. Bottom Row: Performance Overview & Top Performers */}
      <div className="hdb-row-bottom">
        <PerformanceOverview />
        <TopPerformers />
      </div>

      {/* 8. Member Details Modal (Screenshot 4) */}
      <MemberDetailsModal
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
      />
    </div>
  )
}
