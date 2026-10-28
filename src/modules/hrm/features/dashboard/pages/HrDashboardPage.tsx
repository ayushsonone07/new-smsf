import { useMemo, useState, type ReactNode } from "react";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  PlusCircle,
  Sparkles,
  SlidersHorizontal,
  UserPlus,
  UserCheck,
  Users,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAuth } from "@features/auth";
import { BirthdayWidget } from "@features/birthdays";
import { useAttendance, useDashboardCharts, useDashboardKpis, useWeeklyAttendance } from "@features/hr/hooks";
import { hrService } from "@features/hr/services";
import type { AttendanceRecord } from "@features/hr/types";
import {
  countAttendanceStatuses,
  formatAttendanceStatus,
  resolveCheckInStatus,
} from "@features/hr/utils/attendanceStatus";
import { useWeeklyLeaveStatus } from "@features/leave";
import { canonicalSourceKey, prettySource } from "@features/hr/utils/source";
import { useReportsData } from "@features/reports/hooks";
import type { RecruitmentFunnelStage } from "@features/reports/types";
import { AnimatedFilterSelect, AnimatedNumber, StaggerContainer, StaggerItem } from "@shared/components/ui";
import { RefreshButton } from "@/components/ui/RefreshButton";

import { DashboardChartCard } from "../components/DashboardChartCard";
import { DashboardLayout } from "../components/DashboardLayout";
import { LeaveStatusDonutChart } from "../charts/LeaveStatusDonutChart";

type DashboardView = "recruitment" | "employees" | "attendance";

function isDashboardView(value: string | null): value is DashboardView {
  return ["recruitment", "employees", "attendance"].includes(value ?? "");
}

const DASHBOARD_VIEWS: Record<DashboardView, { title: (role: string | undefined) => string; description: string }> = {
  recruitment: {
    title: (role) => (role === "SUB_HR" ? "Sub-HR Dashboard" : role === "ADMIN" ? "Admin Dashboard" : "HR Dashboard"),
    description: "Recruitment and hiring overview",
  },
  employees: {
    title: (role) => (role === "SUB_HR" ? "Sub-HR Employee Dashboard" : role === "ADMIN" ? "Admin Employee Dashboard" : "Employee Dashboard"),
    description: "Employee and attendance overview",
  },
  attendance: {
    title: (role) => (role === "SUB_HR" ? "Sub-HR Leave & Attendance Dashboard" : role === "ADMIN" ? "Admin Leave & Attendance Dashboard" : "Leave & Attendance Dashboard"),
    description: "Attendance and leave overview",
  },
};

interface DashboardHeaderProps {
  title: string;
  description: string;
  filter: ReactNode;
}

function DashboardHeaderCard({
  title,
  description,
  filter,
  refresh,
  children,
}: DashboardHeaderProps & { refresh?: ReactNode; children: ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
      className="mbg-card px-5 py-4 sm:px-6"
    >
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {filter}
          {refresh}
        </div>
      </div>
      <div className="pt-4">{children}</div>
    </motion.section>
  );
}

interface HrDashboardPageProps {
  defaultView?: DashboardView;
}

export default function HrDashboardPage({ defaultView = "recruitment" }: HrDashboardPageProps) {
  const { user } = useAuth();
  const role = user?.role;
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedView = searchParams.get("view");
  const initialView: DashboardView = isDashboardView(selectedView) ? selectedView : defaultView;
  const [view, setView] = useState<DashboardView>(initialView);
  const dashboard = DASHBOARD_VIEWS[view];
  const dashboardTitle = typeof dashboard.title === "function" ? dashboard.title(role) : dashboard.title;

  function setDashboardView(nextView: DashboardView) {
    setView(nextView);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (nextView === defaultView) next.delete("view");
      else next.set("view", nextView);
      return next;
    });
  }

  const filterSelect = (
    <AnimatedFilterSelect
      value={view}
      onValueChange={(nextView) => setDashboardView(nextView as DashboardView)}
      ariaLabel="Filter dashboard by area"
      leadingIcon={SlidersHorizontal}
      className="w-[190px]"
      options={[
        { value: "recruitment", label: "Recruitment" },
        { value: "employees", label: "Employees" },
        { value: "attendance", label: "Leave & Attendance" },
      ]}
    />
  );
  const headerProps: DashboardHeaderProps = {
    title: dashboardTitle,
    description: dashboard.description,
    filter: filterSelect,
  };

  return (
    <DashboardLayout>
      <StaggerContainer className="space-y-6">
      {view === "recruitment" ? (
        <RecruitmentDashboard {...headerProps} />
      ) : view === "employees" ? (
        <WorkforceDashboard {...headerProps} />
      ) : view === "attendance" ? (
        <TimeAttendanceDashboard {...headerProps} />
      ) : (
        <RecruitmentDashboard {...headerProps} />
      )}
      </StaggerContainer>
    </DashboardLayout>
  );
}

function TimeAttendanceDashboard({ title, description, filter }: DashboardHeaderProps) {
  const today = useMemo(() => localDate(new Date()), []);
  const weekRange = useMemo(() => getCurrentWeekRange(), []);
  const todayAttendanceQuery = useAttendance({ date: today, page: 0, size: 100 });
  const weeklyAttendance = useWeeklyAttendance(weekRange.from, weekRange.to);
  const weeklyLeaveStatusQuery = useWeeklyLeaveStatus(weekRange.from, weekRange.to);
  const todayRecords = todayAttendanceQuery.data?.items ?? [];
  const weeklyRecords = weeklyAttendance.records;
  const weeklyLeaveStatus = weeklyLeaveStatusQuery.data ?? [];
  const counts = todayRecords.reduce<Record<string, number>>((result, record) => {
    if (record.status) result[record.status] = (result[record.status] ?? 0) + 1;
    return result;
  }, {});
  const present = (counts.PRESENT ?? 0) + (counts.HALF_DAY ?? 0) + (counts.WORK_FROM_HOME ?? 0);
  const absent = counts.ABSENT ?? 0;
  const onLeave = counts.ON_LEAVE ?? 0;
  const late = todayRecords.filter((record) => resolveCheckInStatus(record) === "LATE_CHECK_IN").length;
  const weekLabel = formatWeekRangeLabel(weekRange);

return (
    <StaggerContainer className="space-y-5">
      <StaggerItem variant="card">
      <DashboardHeaderCard
        title={title}
        description={description}
        filter={filter}
        refresh={
          <RefreshButton
            onRefresh={() =>
              Promise.all([
                todayAttendanceQuery.refetch(),
                weeklyAttendance.refetch(),
                weeklyLeaveStatusQuery.refetch(),
              ])
            }
            isRefreshing={
              todayAttendanceQuery.isFetching || weeklyAttendance.isFetching || weeklyLeaveStatusQuery.isFetching
            }
            label="attendance dashboard"
          />
        }
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Recruitment intelligence
            </div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Attendance, made effortless.
            </h2>
            <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
              Monitor today&rsquo;s team presence, attendance status, and working patterns from one
              clear view.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/hrm/attendance"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-success px-3.5 text-[13px] font-semibold text-primary-foreground transition-colors duration-150 hover:bg-success/90"
            >
              <Clock className="h-4 w-4" /> Manage attendance
            </Link>
            <Link
              to="/hrm/leave"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3.5 text-[13px] font-semibold text-foreground transition-colors duration-150 hover:bg-surface-hover"
            >
              <CalendarDays className="h-4 w-4" /> Review leave
            </Link>
          </div>
        </div>
      </DashboardHeaderCard>
      </StaggerItem>

      <StaggerItem>
      <section
        className={`grid auto-rows-fr grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-4 ${
          todayAttendanceQuery.isFetching && !todayAttendanceQuery.isLoading ? "pointer-events-none opacity-60" : ""
        }`}
      >
        <WorkforceMetric
          delay={0.05}
          label="Present today"
          value={present}
          note="Present, WFH and half days"
          icon={UserCheck}
          tone="emerald"
          loading={todayAttendanceQuery.isLoading}
        />
        <WorkforceMetric
          delay={0.1}
          label="Absent today"
          value={absent}
          note="Marked absent records"
          icon={Users}
          tone="amber"
          loading={todayAttendanceQuery.isLoading}
        />
        <WorkforceMetric
          delay={0.15}
          label="Late arrivals"
          value={late}
          note="Checked in after 9:30 AM"
          icon={Clock}
          tone="sky"
          loading={todayAttendanceQuery.isLoading}
        />
        <WorkforceMetric
          delay={0.2}
          label="On leave today"
          value={onLeave}
          note="Approved leave records"
          icon={CalendarDays}
          tone="indigo"
          loading={todayAttendanceQuery.isLoading}
        />
      </section>
      </StaggerItem>

      <StaggerItem variant="card">
      <section>
        <DashboardChartCard
          title="Check-in & check-out status"
          loading={weeklyAttendance.isLoading}
          actions={
            <RefreshButton
              onRefresh={() => weeklyAttendance.refetch()}
              isRefreshing={weeklyAttendance.isFetching}
              label="check-in & check-out status"
            />
          }
          refreshing={weeklyAttendance.isFetching && !weeklyAttendance.isLoading}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Weekly check-in and check-out breakdown across your team
            </p>
            <span className="shrink-0 rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
              {weekLabel}
            </span>
          </div>
          <CombinedAttendanceStatusDonuts records={weeklyRecords} />
        </DashboardChartCard>
      </section>
      </StaggerItem>

      <StaggerItem variant="card">
      <section>
        <DashboardChartCard
          title="Leave status"
          loading={weeklyLeaveStatusQuery.isLoading}
          actions={
            <RefreshButton
              onRefresh={() => weeklyLeaveStatusQuery.refetch()}
              isRefreshing={weeklyLeaveStatusQuery.isFetching}
              label="leave status"
            />
          }
          refreshing={weeklyLeaveStatusQuery.isFetching && !weeklyLeaveStatusQuery.isLoading}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Weekly leave approvals and rejections
            </p>
            <span className="shrink-0 rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
              {weekLabel}
            </span>
          </div>
          <LeaveStatusDonutChart data={weeklyLeaveStatus} />
        </DashboardChartCard>
      </section>
      </StaggerItem>
    </StaggerContainer>
  );
}

function CombinedAttendanceStatusDonuts({ records }: { records: AttendanceRecord[] }) {
  if (records.length === 0) {
    return (
      <PremiumEmpty
        icon={Clock}
        message="Weekly attendance status will appear here once employees are in scope."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      <div>
        <p className="mb-4 text-center text-sm font-semibold text-card-foreground">Check-in status</p>
        <AttendanceStatusDonut records={records} kind="checkIn" />
      </div>
      <div>
        <p className="mb-4 text-center text-sm font-semibold text-card-foreground">Check-out status</p>
        <AttendanceStatusDonut records={records} kind="checkOut" />
      </div>
    </div>
  );
}

function AttendanceStatusDonut({
  records,
  kind,
}: {
  records: AttendanceRecord[];
  kind: "checkIn" | "checkOut";
}) {
  const rows = countAttendanceStatuses(records, kind);
  const total = records.length;

  if (total === 0) {
    return (
      <PremiumEmpty
        icon={Clock}
        message="Attendance status will appear here once employees are in scope."
      />
    );
  }

  const data = rows.map((row) => ({
    name: formatAttendanceStatus(row.status),
    value: row.count,
    count: row.count,
    pct: row.pct,
    color: row.color,
  }));

  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-5">
      <div className="relative h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={58}
              outerRadius={82}
              paddingAngle={rows.length > 1 ? 3 : 0}
              cornerRadius={6}
              stroke="var(--card)"
              strokeWidth={2}
            >
              {rows.map((row) => (
                <Cell key={row.status} fill={row.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string, item: { payload?: { count: number; pct: number } }) => [
                `${(item.payload?.count ?? value).toLocaleString()} (${item.payload?.pct ?? 0}%)`,
                name,
              ]}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid var(--border)",
                boxShadow: "0 10px 15px -3px rgb(15 23 42 / 0.08)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="w-full max-w-sm space-y-2">
        {rows.map((row) => (
          <div key={row.status} className="flex items-center gap-2.5 text-sm">
            <span
              className="h-3 w-3 shrink-0 rounded-[4px]"
              style={{ backgroundColor: row.color }}
            />
            <span className="font-medium text-card-foreground">
              {formatAttendanceStatus(row.status)}
              <span className="font-normal text-muted-foreground">
                {" "}&mdash; {row.count.toLocaleString()} ({row.pct}%)
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}



function localDate(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function getCurrentWeekRange(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: localDate(monday), to: localDate(sunday) };
}

function formatWeekRangeLabel(range: { from: string; to: string }): string {
  const from = new Date(`${range.from}T00:00:00`);
  const to = new Date(`${range.to}T00:00:00`);
  const sameMonth = from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
  const fromLabel = from.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const toLabel = to.toLocaleDateString(
    undefined,
    sameMonth ? { day: "numeric" } : { month: "short", day: "numeric" },
  );
  return `This week · ${fromLabel} – ${toLabel}`;
}

function WorkforceDashboard({ title, description, filter }: DashboardHeaderProps) {
  const today = useMemo(() => localDate(new Date()), []);
  const employeesQuery = useQuery({
    queryKey: ["dashboard", "workforce", "employees"],
    queryFn: () => hrService.listEmployees({ page: 0, size: 100, sort: "joiningDate,desc" }),
  });
  const attendanceQuery = useAttendance({ date: today, page: 0, size: 100 });
  const employees = employeesQuery.data?.items ?? [];
  const onboardingCounts = employeesQuery.data?.onboardingCounts;
  const attendanceRecords = attendanceQuery.data?.items ?? [];
  const active = employees.filter((employee) => employee.status === "active").length;
  const onLeave = employees.filter((employee) => employee.status === "on_leave").length;
  const thisMonth = new Date();
  const newJoiners = employees.filter((employee) => {
    const joiningDate = new Date(`${employee.joiningDate}T00:00:00`);
    return (
      joiningDate.getMonth() === thisMonth.getMonth() &&
      joiningDate.getFullYear() === thisMonth.getFullYear()
    );
  }).length;
  const activeRate = employees.length ? Math.round((active / employees.length) * 100) : 0;

  const attendanceCounts = attendanceRecords.reduce<Record<string, number>>((result, record) => {
    if (record.status) result[record.status] = (result[record.status] ?? 0) + 1;
    return result;
  }, {});
  const presentCount = attendanceCounts.PRESENT ?? 0;
  const absentCount = attendanceCounts.ABSENT ?? 0;
  const halfDayCount = attendanceCounts.HALF_DAY ?? 0;
  const workFromHomeCount = attendanceCounts.WORK_FROM_HOME ?? 0;
  const onLeaveCount = attendanceCounts.ON_LEAVE ?? 0;
  const totalMarked = presentCount + absentCount + halfDayCount + workFromHomeCount + onLeaveCount;
  const departments = Object.entries(
    employees.reduce<Record<string, number>>((result, employee) => {
      const department = employee.departmentName ?? "Unassigned";
      result[department] = (result[department] ?? 0) + 1;
      return result;
    }, {}),
  )
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  const onboarders = Object.entries(
    employees.reduce<Record<string, number>>((result, employee) => {
      const onboarder = employee.onboardedByName ?? "Not yet onboarded";
      result[onboarder] = (result[onboarder] ?? 0) + 1;
      return result;
    }, {}),
  )
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <StaggerContainer className="space-y-5">
      <StaggerItem variant="card">
      <DashboardHeaderCard
        title={title}
        description={description}
        filter={filter}
        refresh={
          <RefreshButton
            onRefresh={() => Promise.all([employeesQuery.refetch(), attendanceQuery.refetch()])}
            isRefreshing={employeesQuery.isFetching || attendanceQuery.isFetching}
            label="employees dashboard"
          />
        }
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Workforce intelligence
            </div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Your team, beautifully in focus.
            </h2>
            <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
              Understand headcount, team composition, and the latest people updates at a glance.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/hrm/employees"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary-hover"
            >
              <UserPlus className="h-4 w-4" /> Add employee
            </Link>
            <Link
              to="/hrm/departments"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3.5 text-[13px] font-semibold text-foreground transition-colors duration-150 hover:bg-surface-hover"
            >
              <Building2 className="h-4 w-4" /> Departments
            </Link>
          </div>
        </div>
      </DashboardHeaderCard>
      </StaggerItem>

      <StaggerItem>
      <section
        className={`grid auto-rows-fr grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-4 ${
          employeesQuery.isFetching && !employeesQuery.isLoading ? "pointer-events-none opacity-60" : ""
        }`}
      >
        <WorkforceMetric
          delay={0.05}
          label="Total employees"
          value={employees.length}
          note="Across your organisation"
          icon={Users}
          tone="indigo"
          loading={employeesQuery.isLoading}
        />
        <WorkforceMetric
          delay={0.1}
          label="Active employees"
          value={active}
          note={`${activeRate}% of total workforce`}
          icon={UserCheck}
          tone="emerald"
          loading={employeesQuery.isLoading}
        />
        <WorkforceMetric
          delay={0.15}
          label="New joiners"
          value={newJoiners}
          note="Joined this month"
          icon={UserPlus}
          tone="sky"
          loading={employeesQuery.isLoading}
        />
        <WorkforceMetric
          delay={0.2}
          label="On leave"
          value={onLeave}
          note="Current leave status"
          icon={CalendarDays}
          tone="amber"
          loading={employeesQuery.isLoading}
        />
      </section>
      </StaggerItem>

      <StaggerItem variant="card">
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <DashboardChartCard
          title="Workforce health"
          actions={
            <RefreshButton
              onRefresh={() => Promise.all([employeesQuery.refetch(), attendanceQuery.refetch()])}
              isRefreshing={employeesQuery.isFetching || attendanceQuery.isFetching}
              label="workforce health"
            />
          }
          refreshing={(employeesQuery.isFetching || attendanceQuery.isFetching) && !employeesQuery.isLoading && !attendanceQuery.isLoading}
          className="xl:col-span-5"
          loading={employeesQuery.isLoading || attendanceQuery.isLoading}
        >
          <WorkforcePresenceDonut
            present={presentCount}
            absent={absentCount}
            halfDay={halfDayCount}
            workFromHome={workFromHomeCount}
            onLeave={onLeaveCount}
            totalMarked={totalMarked}
            total={employees.length}
          />
        </DashboardChartCard>
        <DashboardChartCard
          title="Department distribution"
          actions={
            <RefreshButton
              onRefresh={() => employeesQuery.refetch()}
              isRefreshing={employeesQuery.isFetching}
              label="department distribution"
            />
          }
          refreshing={employeesQuery.isFetching && !employeesQuery.isLoading}
          className="xl:col-span-7"
          loading={employeesQuery.isLoading}
        >
          <p className="mb-5 text-sm text-muted-foreground">
            Headcount by team, this month.
          </p>
          <DepartmentHistogram rows={departments} />
        </DashboardChartCard>
      </section>
      </StaggerItem>

      <StaggerItem variant="card">
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <DashboardChartCard
          title="Onboarded by"
          actions={
            <RefreshButton
              onRefresh={() => employeesQuery.refetch()}
              isRefreshing={employeesQuery.isFetching}
              label="onboarded by"
            />
          }
          refreshing={employeesQuery.isFetching && !employeesQuery.isLoading}
          className="xl:col-span-12"
          loading={employeesQuery.isLoading}
        >
          <p className="mb-5 text-sm text-muted-foreground">
            Who verified each employee&rsquo;s onboarding.
          </p>
          <OnboarderLeaderboard rows={onboarders} />
        </DashboardChartCard>
      </section>
      </StaggerItem>

      <StaggerItem variant="card">
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <BirthdayWidget />
        </div>
        <DashboardChartCard
          title="Onboarding status"
          actions={
            <RefreshButton
              onRefresh={() => employeesQuery.refetch()}
              isRefreshing={employeesQuery.isFetching}
              label="onboarding status"
            />
          }
          refreshing={employeesQuery.isFetching && !employeesQuery.isLoading}
          className="xl:col-span-5"
          loading={employeesQuery.isLoading}
        >
          <OnboardingStatusDonut counts={onboardingCounts} />
        </DashboardChartCard>
      </section>
      </StaggerItem>
    </StaggerContainer>
  );
}

function WorkforcePresenceDonut({
  present,
  absent,
  halfDay,
  workFromHome,
  onLeave,
  totalMarked,
  total,
}: {
  present: number;
  absent: number;
  halfDay: number;
  workFromHome: number;
  onLeave: number;
  totalMarked: number;
  total: number;
}) {
  const segments = [
    { name: "Present", count: present, dot: "bg-chart-2", fill: "fill-chart-2" },
    { name: "Absent", count: absent, dot: "bg-chart-5", fill: "fill-chart-5" },
    { name: "Half day", count: halfDay, dot: "bg-chart-3", fill: "fill-chart-3" },
    { name: "Work from home", count: workFromHome, dot: "bg-chart-4", fill: "fill-chart-4" },
    { name: "On leave", count: onLeave, dot: "bg-chart-1", fill: "fill-chart-1" },
  ].map((segment) => ({
    ...segment,
    pct: totalMarked ? Math.round((segment.count / totalMarked) * 100) : 0,
  }));
  const isEmpty = totalMarked === 0;
  const data = segments.map((segment) => ({
    name: segment.name,
    value: Math.max(segment.pct, 0),
    count: segment.count,
    pct: segment.pct,
  }));
  const centerLabel = (
    <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center text-center px-3">
      <div>
        <p className="text-2xl font-semibold tracking-tight text-card-foreground">
          {total.toLocaleString()}
        </p>
        <p className="mt-1 text-xs font-medium text-muted-foreground">total staff</p>
      </div>
    </div>
  );
  return (
    <div className="flex min-h-[250px] flex-col items-center justify-center gap-6 sm:flex-row">
      <div className="relative h-44 w-44 shrink-0">
        {isEmpty ? (
          <div className="group relative h-44 w-44">
            <div className="h-44 w-44 rounded-full border-30 border-muted-foreground/40" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-muted-foreground opacity-0 shadow-[0_10px_15px_-3px_rgb(15_23_42/0.08)] transition-opacity duration-150 group-hover:opacity-100">
              Not marked yet
            </div>
          </div>
        ) : (
          <div className="relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={88}
                  paddingAngle={3}
                  cornerRadius={6}
                  stroke="var(--card)"
                  strokeWidth={2}
                >
                  {segments.map((segment) => (
                    <Cell key={segment.name} className={segment.fill} />
                  ))}
                </Pie>
                <Tooltip
                  wrapperStyle={{ zIndex: 20 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0] as { name?: string; payload?: { count: number; pct: number } };
                    return (
                      <div className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs text-card-foreground shadow-[0_10px_15px_-3px_rgb(15_23_42/0.08)]">
                        <span className="font-semibold">{item.name}</span>{" "}
                        <span className="text-muted-foreground">
                          {(item.payload?.count ?? 0).toLocaleString()} · {item.payload?.pct ?? 0}%
                        </span>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {centerLabel}
      </div>
      <div className="w-full max-w-[200px] space-y-2.5">
        {segments.map((segment) => (
          <div key={segment.name} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium text-card-foreground">
              <span className={`h-2.5 w-2.5 rounded-[4px] ${segment.dot}`} /> {segment.name}
            </span>
            <span className="font-mono text-xs font-semibold text-card-foreground">
              {segment.count.toLocaleString()} · {segment.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OnboardingStatusDonut({
  counts,
}: {
  counts: { pending: number; linkSent: number; detailsSubmitted: number; verified: number } | undefined;
}) {
  const segments = [
    { name: "Pending", count: counts?.pending ?? 0, dot: "bg-chart-3", fill: "fill-chart-3" },
    { name: "Link sent", count: counts?.linkSent ?? 0, dot: "bg-chart-4", fill: "fill-chart-4" },
    { name: "Details submitted", count: counts?.detailsSubmitted ?? 0, dot: "bg-chart-1", fill: "fill-chart-1" },
    { name: "Verified", count: counts?.verified ?? 0, dot: "bg-chart-2", fill: "fill-chart-2" },
  ];
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);
  if (total === 0) {
    return <PremiumEmpty icon={UserCheck} message="Onboarding status will appear here once employees join." />;
  }
  const rows = segments.map((segment) => ({
    ...segment,
    pct: Math.round((segment.count / total) * 100),
  }));
  const data = rows.map((row) => ({ name: row.name, value: Math.max(row.pct, 0), count: row.count, pct: row.pct }));
  return (
    <div className="flex min-h-[250px] flex-col items-center justify-center gap-6 sm:flex-row">
      <div className="relative h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={3}
              cornerRadius={6}
              stroke="var(--card)"
              strokeWidth={2}
            >
              {rows.map((row) => (
                <Cell key={row.name} className={row.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(_value: number, name: string, item: { payload?: { count: number; pct: number } }) => [
                `${(item.payload?.count ?? 0).toLocaleString()} · ${item.payload?.pct ?? 0}%`,
                name,
              ]}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid var(--border)",
                boxShadow: "0 10px 15px -3px rgb(15 23 42 / 0.08)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center px-3">
          <div>
            <p className="text-2xl font-semibold tracking-tight text-card-foreground">
              {total.toLocaleString()}
            </p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">onboarding</p>
          </div>
        </div>
      </div>
      <div className="w-full max-w-[200px] space-y-2.5">
        {rows.map((row) => (
          <div key={row.name} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium text-card-foreground">
              <span className={`h-2.5 w-2.5 rounded-[4px] ${row.dot}`} /> {row.name}
            </span>
            <span className="font-mono text-xs font-semibold text-card-foreground">
              {row.count.toLocaleString()} · {row.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DepartmentHistogram({ rows }: { rows: [string, number][] }) {
  if (rows.length === 0)
    return (
      <PremiumEmpty icon={Building2} message="Add employees to see your department distribution." />
    );
  const max = Math.max(...rows.map(([, count]) => count), 1);
  const chartArea = 148;
  const palette = ["bg-chart-4", "bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-5"];
  return (
    <div>
      <div className="relative flex h-[200px] items-end gap-6 border-b border-border px-2">
        <div className="absolute inset-x-2 bottom-0 h-[33%] border-t border-dashed border-border/70" />
        <div className="absolute inset-x-2 bottom-0 h-[66%] border-t border-dashed border-border/70" />
        {rows.map(([department, count], index) => {
          const barHeight = Math.max((count / max) * chartArea, 6);
          return (
            <div key={department} className="flex h-full flex-1 flex-col items-center justify-end">
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 + index * 0.15 }}
                className="mb-1.5 text-xs font-bold text-card-foreground"
              >
                {count.toLocaleString()}
              </motion.span>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: barHeight }}
                transition={{ duration: 1, delay: index * 0.12, ease: [0.2, 0.8, 0.2, 1] }}
                className={`w-full max-w-[56px] rounded-t-md ${palette[index % palette.length]}`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-6 px-2 pt-2.5">
        {rows.map(([department]) => (
          <span
            key={department}
            className="min-w-0 flex-1 truncate text-center text-xs font-semibold text-muted-foreground"
          >
            {department}
          </span>
        ))}
      </div>
    </div>
  );
}

function OnboarderLeaderboard({ rows }: { rows: [string, number][] }) {
  if (rows.length === 0)
    return (
      <PremiumEmpty icon={UserCheck} message="Onboarding activity will appear here once employees are verified." />
    );
  const total = rows.reduce((sum, [, count]) => sum + count, 0);
  const palette = ["bg-chart-4", "bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-5"];
  return (
    <div className="space-y-4">
      {rows.map(([name, count], index) => {
        const pct = total ? Math.round((count / total) * 100) : 0;
        return (
          <div key={name} className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-surface-muted text-xs font-bold text-card-foreground">
              {initials(name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-card-foreground">{name}</span>
                <span className="shrink-0 font-mono text-xs font-semibold text-muted-foreground">
                  {count.toLocaleString()} · {pct}%
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(pct, 4)}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1, ease: [0.2, 0.8, 0.2, 1] }}
                  className={`h-full rounded-full ${palette[index % palette.length]}`}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WorkforceMetric({
  delay,
  label,
  value,
  note,
  icon: Icon,
  tone,
  loading,
}: {
  delay: number;
  label: string;
  value: number;
  note: string;
  icon: typeof Users;
  tone: "indigo" | "emerald" | "sky" | "amber";
  loading: boolean;
}) {
  const tones = {
    indigo: "bg-primary-soft text-primary",
    emerald: "bg-success-soft text-success",
    sky: "bg-info-soft text-info",
    amber: "bg-warning-soft text-warning",
  };
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="mbg-card flex items-start justify-between gap-3 p-4"
    >
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-bold tracking-tight text-card-foreground">
          <AnimatedNumber value={loading ? "—" : value} />
        </p>
        <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          <ArrowUpRight className="h-3.5 w-3.5 text-success" />
          {note}
        </p>
      </div>
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </span>
    </motion.article>
  );
}

function PremiumEmpty({ icon: Icon, message }: { icon: typeof Users; message: string }) {
  return (
    <div className="grid min-h-[190px] place-items-center rounded-xl border border-dashed border-border bg-surface-muted/30 px-6 text-center">
      <div>
        <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-surface-elevated text-primary shadow">
          <Icon className="h-5 w-5" />
        </span>
        <p className="mt-3 max-w-xs text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() || "--"
  );
}

function RecruitmentDashboard({ title, description, filter }: DashboardHeaderProps) {
  const range = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 29);
    return { from, to };
  }, []);
  const kpis = useDashboardKpis(range);
  const charts = useDashboardCharts(range);
  const reports = useReportsData();
  const recruitmentFunnel = reports.data?.recruitmentFunnel ?? [];
  const data = kpis.data;
  const chartData = charts.data;
  const monthGrowth = data?.monthOverMonthGrowthPct ?? 0;
  const { user } = useAuth();
  const firstName = user?.name?.trim().split(/\s+/).find(Boolean) ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const intakeSparkline = useMemo(
    () => (chartData?.dailyIntake ?? []).slice(-14).map((point) => point.count),
    [chartData],
  );

return (
    <StaggerContainer className="space-y-5">
      <StaggerItem variant="card">
      <DashboardHeaderCard
        title={title}
        description={description}
        filter={filter}
        refresh={
          <RefreshButton
            onRefresh={() => Promise.all([kpis.refetch(), charts.refetch(), reports.refetch()])}
            isRefreshing={kpis.isFetching || charts.isFetching || reports.isFetching}
            label="recruitment dashboard"
          />
        }
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Recruitment intelligence
            </div>
            <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
              {greeting}, {firstName}
            </h2>
            <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              {" · "}Your live candidate activity over the last 30 days.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="mbg-status-pill rounded-md bg-success-soft px-2 py-1 text-[11px] font-semibold text-success">
                {(data?.totalCandidates ?? 0).toLocaleString()} candidate
                {(data?.totalCandidates ?? 0) === 1 ? "" : "s"} in your database
              </span>
              <span className="mbg-status-pill rounded-md bg-primary-soft px-2 py-1 text-[11px] font-semibold text-primary">
                {data?.topSource
                  ? `Top source: ${prettySource(data.topSource.source)} · ${Math.round(data.topSource.pct)}%`
                  : "Tracking candidate sources"}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link
              to="/hrm/candidates"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary-hover"
            >
              <PlusCircle className="h-4 w-4" /> Add candidate
            </Link>
            <Link
              to="/hrm/interviews"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface-elevated px-3.5 text-[13px] font-semibold text-foreground transition-colors duration-150 hover:bg-surface-hover"
            >
              <CalendarDays className="h-4 w-4" /> View interviews
            </Link>
          </div>
        </div>
      </DashboardHeaderCard>
      </StaggerItem>

      <StaggerItem>
      <section
        className={`grid auto-rows-fr grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-4 ${
          (kpis.isFetching || charts.isFetching) && !kpis.isLoading ? "pointer-events-none opacity-60" : ""
        }`}
      >
        <RecruitmentMetric
          label="Total candidates"
          value={data?.totalCandidates}
          detail="Candidates in your database"
          icon={Users}
          tone="indigo"
        />
        <RecruitmentMetric
          label="Added today"
          value={data?.addedToday}
          detail={`New profiles · ${(data?.addedThisWeek ?? 0).toLocaleString()} this week`}
          icon={PlusCircle}
          tone="cyan"
        />
        <RecruitmentMetric
          label="Added this month"
          value={data?.addedThisMonth}
          detail="vs last month"
          icon={CalendarDays}
          tone="amber"
          trend={monthGrowth}
          sparkline={intakeSparkline}
        />
        <RecruitmentMetric
          label="Profile quality"
          value={data?.withRemarksPct === undefined ? undefined : Math.round(data.withRemarksPct)}
          detail="Profiles with recruiter notes"
          icon={Sparkles}
          tone="violet"
        />
      </section>
      </StaggerItem>

      <StaggerItem variant="card">
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <DashboardChartCard
          title="Candidate intake"
          actions={
            <RefreshButton
              onRefresh={() => charts.refetch()}
              isRefreshing={charts.isFetching}
              label="candidate intake"
            />
          }
          refreshing={charts.isFetching && !charts.isLoading}
          className="xl:col-span-7"
          loading={charts.isLoading}
          emptyMessage="No candidate intake has been recorded for this period."
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Daily profiles added during the selected period
            </p>
            <span className="shrink-0 rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
              Last 30 days
            </span>
          </div>
          <DailyIntakeChart data={chartData?.dailyIntake ?? []} />
        </DashboardChartCard>

        <DashboardChartCard
          title="Profile completion"
          actions={
            <RefreshButton
              onRefresh={() => kpis.refetch()}
              isRefreshing={kpis.isFetching}
              label="profile completion"
            />
          }
          refreshing={kpis.isFetching && !kpis.isLoading}
          className="xl:col-span-5"
          loading={kpis.isLoading}
          emptyMessage="Add candidates to see profile quality."
        >
          <PipelineRing value={data?.withRemarksPct ?? 0} total={data?.totalCandidates ?? 0} />
        </DashboardChartCard>
      </section>
      </StaggerItem>

      <StaggerItem variant="card">
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <DashboardChartCard
          title="Candidate sources"
          actions={
            <RefreshButton
              onRefresh={() => charts.refetch()}
              isRefreshing={charts.isFetching}
              label="candidate sources"
            />
          }
          refreshing={charts.isFetching && !charts.isLoading}
          className="xl:col-span-12"
          loading={charts.isLoading}
          emptyMessage="No source data has been recorded yet."
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Where your candidate applications originate
            </p>
            <span className="shrink-0 rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
              By channel
            </span>
          </div>
          <CandidateSourcesChart data={chartData?.sourceBreakdown ?? []} />
        </DashboardChartCard>
      </section>
      </StaggerItem>

      <StaggerItem variant="card">
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <DashboardChartCard
          title="Recruitment funnel"
          actions={
            <RefreshButton
              onRefresh={() => reports.refetch()}
              isRefreshing={reports.isFetching}
              label="recruitment funnel"
            />
          }
          refreshing={reports.isFetching && !reports.isLoading}
          className="xl:col-span-12"
          loading={reports.isLoading}
          isEmpty={recruitmentFunnel.length === 0}
          emptyMessage="Recruitment funnel data is not yet available."
        >
          <RecruitmentFunnelStageList data={recruitmentFunnel} />
        </DashboardChartCard>
      </section>
      </StaggerItem>
    </StaggerContainer>
  );
}

function stageLabel(stage: string): string {
  const labels: Record<string, string> = {
    NEW: "New",
    SHORTLISTED: "Shortlisted",
    CONTACTED: "Contacted",
    IN_PROCESS: "In process",
    INTERVIEW: "Interview",
    OFFERED: "Offered",
    REQUEST_HIRING_APPROVAL: "Approval",
    HIRED: "Hired",
    REJECTED: "Rejected",
    WITHDRAWN: "Withdrawn",
    ON_HOLD: "On hold",
  };
  return labels[stage] ?? stage.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (match) => match.toUpperCase());
}

function stageGradient(index: number): string {
  const gradients = [
    ["#7C3AED", "#3B82F6"],
    ["#06B6D4", "#14B8A6"],
    ["#22C55E", "#84CC16"],
    ["#F59E0B", "#F97316"],
    ["#EF4444", "#E11D48"],
    ["#6366F1", "#0EA5E9"],
  ] as const;
  const gradient = gradients[index % gradients.length] as readonly [string, string];
  const [from, to] = gradient;
  return `linear-gradient(90deg, ${from}, ${to})`;
}

function stageBadgeBackground(index: number): string {
  const backgrounds = [
    "rgba(124,58,237,0.12)",
    "rgba(6,182,212,0.12)",
    "rgba(34,197,94,0.12)",
    "rgba(245,158,11,0.12)",
    "rgba(239,68,68,0.12)",
    "rgba(99,102,241,0.12)",
  ] as const;
  return (backgrounds[index % backgrounds.length] ?? backgrounds[0]) as string;
}

function RecruitmentFunnelStageList({ data }: { data: RecruitmentFunnelStage[] }) {
  if (data.length === 0) {
    return <EmptyChart message="No recruitment funnel data has been recorded yet." />;
  }

  const total = data.reduce((sum, item) => sum + item.count, 0);
  const formattedTotal = total.toLocaleString();

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border/70 bg-gradient-to-br from-background via-surface to-surface-muted/80 p-4 shadow shadow-slate-900/5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Funnel overview</p>
            <h4 className="mt-2 text-lg font-semibold text-foreground">Recruitment progress</h4>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <div className="rounded-full border border-border/70 bg-white/80 px-3 py-1 text-foreground shadow">
              {formattedTotal} candidates
            </div>
            <div className="rounded-full border border-border/70 bg-white/80 px-3 py-1 text-foreground shadow">
              {data.length} stages
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {data.map((item, index) => {
          const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;
          const stageGradientStyle = stageGradient(index);
          const badgeStyle = { backgroundColor: stageBadgeBackground(index) };

          return (
            <motion.div
              key={item.stage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.04 }}
              className="rounded-3xl border border-border/70 bg-card/80 p-4 shadow shadow-slate-900/5 transition transform hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-foreground" style={badgeStyle}>
                    {stageLabel(item.stage)}
                  </span>
                  {item.rate !== undefined && item.rate !== null ? (
                    <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                      {item.rate}% conversion
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{item.count.toLocaleString()}</span>
                  <span>{percent}%</span>
                </div>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100/60">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(percent, 6)}%`, backgroundImage: stageGradientStyle }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function RecruitmentMetric({
  label,
  value,
  detail,
  icon: Icon,
  tone,
  trend,
  sparkline,
}: {
  label: string;
  value: number | undefined;
  detail: string;
  icon: typeof Users;
  tone: "indigo" | "cyan" | "violet" | "amber";
  trend?: number;
  sparkline?: number[];
}) {
  const tones = {
    indigo: "bg-primary-soft text-primary",
    cyan: "bg-info-soft text-info",
    violet: "bg-primary-soft text-primary",
    amber: "bg-warning-soft text-warning",
  };
  const trendUp = (trend ?? 0) >= 0;
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 }}
      className="mbg-card group flex min-h-[150px] flex-col justify-between gap-3 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-transform duration-150 group-hover:scale-110 ${tones[tone]}`}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <div>
        <p className="text-3xl font-bold tracking-tight text-card-foreground">
          <AnimatedNumber value={value ?? "—"} />
        </p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
            {trend !== undefined ? (
              <span
                className={`mbg-status-pill inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  trendUp ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
                }`}
              >
                <ArrowUpRight className={`h-3 w-3 ${trendUp ? "" : "rotate-90"}`} />
                {trendUp ? "+" : ""}
                {trend}%
              </span>
            ) : null}
            <span className="truncate text-[11px] font-medium text-muted-foreground">{detail}</span>
          </div>
          {sparkline && sparkline.length > 1 ? <MetricSparkline values={sparkline} /> : null}
        </div>
      </div>
    </motion.article>
  );
}

function MetricSparkline({ values }: { values: number[] }) {
  const width = 90;
  const height = 30;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - 3 - ((value - min) / range) * (height - 8);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg
      aria-hidden="true"
      className="h-8 w-[90px] shrink-0"
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
    >
      <path
        d={`M ${points} L ${width} ${height} L 0 ${height} Z`}
        fill="hsl(var(--primary))"
        fillOpacity="0.08"
      />
      <polyline
        points={points}
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PipelineRing({ value, total }: { value: number; total: number }) {
  const data = [{ value, fill: "hsl(var(--primary))" }];
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center sm:flex-row sm:gap-6">
      <div className="relative h-48 w-48 shrink-0">
        <ResponsiveContainer>
          <RadialBarChart
              data={data}
              innerRadius="72%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar dataKey="value" background={{ fill: "hsl(var(--muted))" }} cornerRadius={8} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-2xl font-semibold tracking-tight text-card-foreground">{value}%</p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">with notes</p>
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-3 sm:mt-0">
        <p className="max-w-[180px] text-sm leading-6 text-muted-foreground">
          {value.toFixed(1)}% of {total.toLocaleString()} candidate profiles include recruiter
          remarks.
        </p>
        <div className="inline-flex items-center gap-2 rounded-lg bg-success-soft px-3 py-2 text-sm font-semibold text-success">
          <CheckCircle2 className="h-4 w-4" /> Profile quality indicator
        </div>
      </div>
    </div>
  );
}

function sourceColor(source: string): string {
  const palette: Record<string, string> = {
    linkedin: "hsl(var(--chart-4))",
    naukri: "hsl(var(--chart-1))",
    referral: "hsl(var(--chart-2))",
    walk_in: "hsl(var(--chart-5))",
    college: "hsl(var(--chart-3))",
    other: "hsl(var(--muted-foreground))",
  };
  return palette[canonicalSourceKey(source)] ?? "hsl(var(--chart-1))";
}

function CandidateSourcesChart({ data }: { data: { source: string; count: number }[] }) {
  if (data.length === 0) return <EmptyChart message="No source data has been recorded yet." />;

  const KNOWN_SOURCES = ["naukri", "referral", "linkedin", "walk_in", "college", "other"];
  const counts = new Map<string, number>(KNOWN_SOURCES.map((key) => [key, 0]));
  for (const item of data) {
    const key = canonicalSourceKey(item.source);
    const bucket = KNOWN_SOURCES.includes(key) ? key : "other";
    counts.set(bucket, (counts.get(bucket) ?? 0) + item.count);
  }

  const rows = Array.from(counts, ([key, count]) => ({
    key,
    source: prettySource(key),
    count,
    fill: sourceColor(key),
  })).sort((a, b) => b.count - a.count);

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={rows} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
        <XAxis
          dataKey="source"
          tick={{ fontSize: 11, className: "fill-muted-foreground" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, className: "fill-muted-foreground" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ className: "fill-surface-muted" }}
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid var(--border)",
            boxShadow: "0 10px 15px -3px rgb(15 23 42 / 0.08)",
          }}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
          {rows.map((item) => (
            <Cell key={item.source} fill={item.fill} fillOpacity={0.9} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}



function DailyIntakeChart({ data }: { data: { date: string; count: number }[] }) {
  if (data.length === 0)
    return <EmptyChart message="No candidate intake has been recorded for this period." />;
  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, className: "fill-muted-foreground" }}
          axisLine={false}
          tickLine={false}
          minTickGap={26}
          tickFormatter={(date: string) =>
            new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })
          }
        />
        <YAxis
          tick={{ fontSize: 11, className: "fill-muted-foreground" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ className: "fill-surface-muted" }}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" }}
          labelFormatter={(date) =>
            new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
            })
          }
        />
        <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="hsl(var(--primary))" fillOpacity={0.14} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="grid h-[250px] place-items-center rounded-xl border border-dashed border-border bg-surface-muted/70 px-5 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
