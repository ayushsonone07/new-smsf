import {
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardList,
  Clock,
  FileText,
  Handshake,
  RefreshCw,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import { env } from "@config/env";
import { useAuth } from "@features/auth";
import { ErrorDisplay, PageHeader, StaggerContainer, StaggerItem } from "@shared/components/ui";

import { AttendanceTrendChart } from "../charts/AttendanceTrendChart";
import { DepartmentDistributionChart } from "../charts/DepartmentDistributionChart";
import { LeaveStatusDonutChart } from "../charts/LeaveStatusDonutChart";
import { RecruitmentFunnelChart } from "../charts/RecruitmentFunnelChart";
import { DashboardChartCard } from "../components/DashboardChartCard";
import { DashboardKpiCard } from "../components/DashboardKpiCard";
import {
  DashboardKpiGrid,
  DashboardLayout,
  DashboardSplitGrid,
  DashboardWelcomeHeader,
} from "../components/DashboardLayout";
import { DashboardSection } from "../components/DashboardSection";
import { QuickActions } from "../components/QuickActions";
import { RecentActivity } from "../components/RecentActivity";
import { UpcomingEvents } from "../components/UpcomingEvents";
import { hasPermission } from "../config/dashboardPermissions";
import { HR_HEAD_DEMO_DATA } from "../data/dashboard.demo";
import { useHrHeadDashboard } from "../hooks/useDashboardData";

import type { RecentActivity as RecentActivityResponse, UpcomingEvent } from "../services/dashboardService";
import type { DashboardActivity, DashboardEvent } from "../types/dashboard.types";

const DEPARTMENT_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function toDashboardActivity(item: RecentActivityResponse): DashboardActivity {
  const type: DashboardActivity["type"] =
    item.type === "candidate" || item.type === "employee" || item.type === "leave" ||
    item.type === "attendance" || item.type === "onboarding" || item.type === "general"
      ? item.type
      : "general";
  return {
    id: String(item.id),
    type,
    description: item.description ?? item.title,
    timestamp: item.createdAt,
  };
}

function toDashboardEvent(item: UpcomingEvent): DashboardEvent {
  const type: DashboardEvent["type"] =
    item.type === "interview" || item.type === "birthday" || item.type === "anniversary" ||
    item.type === "holiday" || item.type === "approval"
      ? item.type
      : "approval";
  return { id: String(item.id), title: item.title, date: item.date, type };
}

function formatTimestamp(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

export default function HrHeadDashboardPage() {
  const { role, user } = useAuth();
  const { data, isLoading, error, refetch, isFetching } = useHrHeadDashboard();

  if (isLoading) {
    return (
      <div className="space-y-5">
        <PageHeader title="HR Head Dashboard" description="Organisation-level HR overview" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  const dashboardData = data ?? (env.enableDashboardDemo ? HR_HEAD_DEMO_DATA : undefined);
  if (!dashboardData || error) {
    return <DashboardLayout><StaggerContainer><StaggerItem><PageHeader title="HR Head Dashboard" description="Organisation-level HR overview" /></StaggerItem><StaggerItem variant="card"><ErrorDisplay message="Dashboard data could not be loaded from the server." /></StaggerItem></StaggerContainer></DashboardLayout>;
  }
  const c = dashboardData.counts;
  const lastUpdated = formatTimestamp(dashboardData.generatedAt);
  const attendanceTrend = dashboardData.attendanceTrend.map((point) => ({
    date: point.date,
    present: point.present,
    absent: point.absent,
    late: point.late,
    leave: point.onLeave,
  }));
  const departmentDistribution = dashboardData.departmentDistribution.map((dept, index) => ({
    name: dept.departmentName,
    value: dept.employeeCount,
    color: DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length] ?? "hsl(var(--chart-1))",
  }));
  const recruitmentFunnel = dashboardData.recruitmentFunnel;
  const leaveStatus = dashboardData.leaveStatusDistribution;
  const activities = dashboardData.recentActivities.map(toDashboardActivity);
  const events = dashboardData.upcomingEvents.map(toDashboardEvent);

  return (
    <DashboardLayout>
      <StaggerContainer>
      <StaggerItem variant="card">
        <DashboardWelcomeHeader
        title={`Welcome back, ${user?.name ?? "HR Head"}`}
        description="Your organisation-wide overview across people, attendance, and hiring."
        eyebrow={
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
            <Building2 className="h-3.5 w-3.5" /> Organisation overview
          </div>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="mbg-status-pill rounded-md bg-warning-soft px-2 py-1 text-[11px] font-semibold text-warning">
              {c?.pendingLeaveRequests ?? 0} approvals pending
            </span>
            <span className="mbg-status-pill rounded-md bg-info-soft px-2 py-1 text-[11px] font-semibold text-info">
              {c?.upcomingInterviews ?? 0} upcoming interviews
            </span>
            {lastUpdated ? (
              <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
                Updated {lastUpdated}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              aria-label={isFetching ? "Refreshing HR-Head dashboard" : "Refresh HR-Head dashboard"}
              title="Refresh HR-Head dashboard"
              className="mbg-icon-button inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface-elevated text-foreground hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-70"
            >
              <RefreshCw size={18} className={isFetching ? "animate-spin" : undefined} />
            </button>
          </div>
        }
      />
      </StaggerItem>

      <DashboardKpiGrid>
        <DashboardKpiCard
          label="Total Employees"
          value={c?.totalEmployees ?? 0}
          icon={Users}
          color="primary"
          metadata="Organisation records"
        />
        <DashboardKpiCard
          label="Active Employees"
          value={c?.activeEmployees ?? 0}
          icon={UserCheck}
          color="success"
          metadata="Active workforce"
        />
        <DashboardKpiCard
          label="Present Today"
          value={c?.presentToday ?? 0}
          icon={Clock}
          color="success"
          metadata="Today’s attendance"
        />
        <DashboardKpiCard
          label="On Leave Today"
          value={c?.employeesOnLeaveToday ?? 0}
          icon={CalendarDays}
          color="warning"
          metadata="Scheduled leave today"
        />
        <DashboardKpiCard
          label="Pending Leave"
          value={c?.pendingLeaveRequests ?? 0}
          icon={CalendarDays}
          color="warning"
          metadata="Approval queue"
        />
        <DashboardKpiCard
          label="Candidates"
          value={c?.totalCandidates ?? 0}
          icon={UserPlus}
          color="info"
          metadata="Recruitment pipeline"
        />
        <DashboardKpiCard
          label="Upcoming Interviews"
          value={c?.upcomingInterviews ?? 0}
          icon={CalendarDays}
          color="info"
          metadata="Interview schedule"
        />
        <DashboardKpiCard
          label="Onboarding In Progress"
          value={c?.onboardingsInProgress ?? 0}
          icon={Handshake}
          color="primary"
          metadata="People operations"
        />
      </DashboardKpiGrid>

      <StaggerItem variant="card">
      <DashboardSplitGrid>
        <DashboardChartCard
          title="Department distribution"
          loading={isLoading}
          isEmpty={departmentDistribution.length === 0}
          emptyMessage="No department data available for the selected period."
        >
          <DepartmentDistributionChart data={departmentDistribution} />
        </DashboardChartCard>
        <DashboardChartCard
          title="Attendance trend"
          loading={isLoading}
          isEmpty={attendanceTrend.length === 0}
          emptyMessage="No attendance data available for the selected period."
        >
          <AttendanceTrendChart data={attendanceTrend} />
        </DashboardChartCard>
      </DashboardSplitGrid>
      </StaggerItem>

      <StaggerItem variant="card">
      <section className="grid grid-cols-1 items-stretch gap-5 xl:grid-cols-12">
        <DashboardChartCard
          title="Recruitment funnel"
          className="xl:col-span-7"
          loading={isLoading}
          isEmpty={recruitmentFunnel.length === 0}
          emptyMessage="No recruitment data available for the selected period."
        >
          <RecruitmentFunnelChart data={recruitmentFunnel} />
        </DashboardChartCard>
        <DashboardChartCard
          title="Leave status"
          className="xl:col-span-5"
          loading={isLoading}
          isEmpty={leaveStatus.length === 0}
          emptyMessage="No leave data available for the selected period."
        >
          <LeaveStatusDonutChart data={leaveStatus} />
        </DashboardChartCard>
      </section>
      </StaggerItem>

      <StaggerItem variant="card">
      <DashboardSplitGrid>
        <DashboardSection title="Recent Activity">
          <RecentActivity
            activities={activities}
            emptyMessage="No recent HR activity available."
          />
        </DashboardSection>
        <DashboardSection title="Upcoming Events">
          <UpcomingEvents events={events} emptyMessage="No upcoming HR events." />
        </DashboardSection>
      </DashboardSplitGrid>
      </StaggerItem>

      <StaggerItem variant="card">
      <DashboardSection title="Quick Actions">
        <QuickActions
          actions={[
            ...(hasPermission(role, "employee:create")
              ? [{ label: "+ Employee", icon: UserPlus, to: "/hrm/employees" }]
              : []),
            ...(hasPermission(role, "candidate:create")
              ? [{ label: "+ Candidate", icon: UserCheck, to: "/hrm/candidates" }]
              : []),
            ...(hasPermission(role, "department:manage")
              ? [{ label: "Department", icon: Building2, to: "/hrm/departments" }]
              : []),
            ...(hasPermission(role, "designation:manage")
              ? [{ label: "Designation", icon: Briefcase, to: "/hrm/designations" }]
              : []),
            ...(hasPermission(role, "leave:view_all")
              ? [{ label: "Review Leave", icon: CalendarDays, to: "/hrm/leave" }]
              : []),
            ...(hasPermission(role, "onboarding:manage")
              ? [{ label: "Onboarding", icon: Handshake, to: "/hrm/onboarding" }]
              : []),
            ...(hasPermission(role, "reports:view_all")
              ? [{ label: "Reports", icon: FileText, to: "/hrm/reports" }]
              : []),
            { label: "My Tasks", icon: ClipboardList, to: "/hrm/my-tasks" },
          ]}
        />
      </DashboardSection>
      </StaggerItem>

      <StaggerItem>
      <div className="flex justify-end">
        <Link
          to="/hrm/leave"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
        >
          <CalendarDays size={16} />
          Open leave management
        </Link>
      </div>
      </StaggerItem>
      </StaggerContainer>
    </DashboardLayout>
  );
}
