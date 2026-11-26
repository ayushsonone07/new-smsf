import { useEffect, useState } from "react";
import {
  ArrowRight,
  Briefcase,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Gift,
  ListTodo,
  MapPin,
  Moon,
  Palmtree,
  PartyPopper,
  Sparkles,
  Star,
  Sun,
  Sunrise,
  Sunset,
  Timer,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import { env } from "@config/env";
import { useAuth } from "@features/auth";
import { BirthdayWidget } from "@features/birthdays";
import { ErrorDisplay, StaggerContainer, StaggerItem } from "@shared/components/ui";
import { RefreshButton } from "@/components/ui/RefreshButton";

import { DashboardLayout } from "../components/DashboardLayout";
import { EMPLOYEE_DEMO_DATA } from "../data/dashboard.demo";
import { useEmployeeDashboard } from "../hooks/useDashboardData";

function formatDuration(minutes: number | undefined): string {
  const value = minutes ?? 0;
  const hours = Math.floor(value / 60).toString().padStart(2, "0");
  const mins = (value % 60).toString().padStart(2, "0");
  return `${hours}:${mins}:00`;
}

function formatHours(minutes: number | undefined): string {
  const value = minutes ?? 0;
  return `${Math.floor(value / 60)}h ${(value % 60).toString().padStart(2, "0")}m`;
}

function shortDate(value: string): { dayName: string; dayNum: string; month: string } {
  const d = new Date(`${value.slice(0, 10)}T00:00:00`);
  return {
    dayName: d.toLocaleDateString(undefined, { weekday: "short" }),
    dayNum: d.toLocaleDateString(undefined, { day: "numeric" }),
    month: d.toLocaleDateString(undefined, { month: "short" }),
  };
}

function getInitials(name: string): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getGreeting(hour: number): { text: string; icon: typeof Sun } {
  if (hour >= 5 && hour < 12) return { text: "Good morning", icon: Sunrise };
  if (hour >= 12 && hour < 17) return { text: "Good afternoon", icon: Sun };
  if (hour >= 17 && hour < 21) return { text: "Good evening", icon: Sunset };
  return { text: "Good night", icon: Moon };
}

export default function EmployeeDashboardPage() {
  const { role } = useAuth();
  const dashboardQuery = useEmployeeDashboard();
  const { data, isLoading, error } = dashboardQuery;
  const refreshButton = (
    <RefreshButton
      onRefresh={() => dashboardQuery.refetch()}
      isRefreshing={dashboardQuery.isFetching}
      label="dashboard"
    />
  );
  const [liveClock, setLiveClock] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setLiveClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dashboardData = data ?? (env.enableDashboardDemo ? EMPLOYEE_DEMO_DATA : undefined);

  if (!isLoading && (!dashboardData || error)) {
    return (
      <DashboardLayout>
        <StaggerContainer>
          <StaggerItem>
            <div className="flex items-center justify-between gap-3">
              <h1 className="mbg-heading">My Dashboard</h1>
              {refreshButton}
            </div>
          </StaggerItem>
          <StaggerItem variant="card">
            <ErrorDisplay message="Dashboard data could not be loaded from the server." />
          </StaggerItem>
        </StaggerContainer>
      </DashboardLayout>
    );
  }

  if (!dashboardData) return null;

  const employee = dashboardData.employee;
  const attendance = dashboardData.todayAttendance;
  const counts = dashboardData.counts;
  const balances = dashboardData.leaveBalances;
  const events = dashboardData.upcomingEvents;
  const week = dashboardData.attendanceTrend.slice(-5);
  const isManager = role === "MANAGER";

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="h-44 animate-pulse rounded-2xl bg-muted" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-56 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  const currentHour = liveClock.getHours();
  const greeting = getGreeting(currentHour);
  const GreetingIcon = greeting.icon;
  const isCheckedIn = Boolean(attendance?.checkIn);
  const isCheckedOut = Boolean(attendance?.checkOut);

  return (
    <DashboardLayout
      className={`space-y-6 transition-opacity ${
        dashboardQuery.isFetching && !isLoading ? "pointer-events-none opacity-60" : ""
      }`}
    >
      {/* 1. CLEAN WELCOME HEADER CARD */}
      <StaggerContainer>
        <StaggerItem variant="card">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              {/* Left: Avatar, Name & Meta */}
              <div className="flex items-start sm:items-center gap-4 min-w-0">
                <div className="relative shrink-0">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-600 text-lg font-bold text-white shadow-xs">
                    {getInitials(employee.name)}
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
                      isCheckedIn ? "bg-emerald-500" : "bg-slate-400"
                    }`}
                    title={isCheckedIn ? "Checked In" : "Pending Check-In"}
                  />
                </div>

                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1 font-semibold text-orange-600">
                      <GreetingIcon className="h-3.5 w-3.5" />
                      {greeting.text}
                    </span>
                    <span>•</span>
                    <span>
                      {liveClock.toLocaleDateString(undefined, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span>•</span>
                    <span className="font-mono font-semibold text-slate-700">
                      {liveClock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {refreshButton}
                  </div>

                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                      {employee.name}
                    </h1>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                      <Briefcase size={12} />
                      {employee.department ?? "Technology"} · Mumbai HQ
                    </span>
                  </div>

                  {/* Subtle Stat Pills */}
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                      <ListTodo size={13} className="text-blue-600" />
                      <strong className="font-bold text-slate-900">{counts.pendingTasks ?? 0}</strong> pending task{(counts.pendingTasks ?? 0) === 1 ? "" : "s"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                      <Clock size={13} className="text-amber-600" />
                      <strong className="font-bold text-slate-900">{counts.pendingLeaveRequests ?? 0}</strong> leave requests
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                      <CalendarCheck size={13} className="text-emerald-600" />
                      <strong className="font-bold text-slate-900">{counts.presentDaysThisMonth ?? 0}</strong> days present
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Primary Action Buttons */}
              <div className="flex shrink-0 flex-wrap items-center gap-2.5">
                <Link
                  to="/hrm/attendance"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 px-4 text-xs font-bold text-white shadow-xs transition"
                >
                  <Clock className="h-4 w-4" />
                  <span>{isCheckedOut ? "View Attendance" : isCheckedIn ? "Punch Out / Check" : "Log Attendance"}</span>
                </Link>

                <Link
                  to="/hrm/leave"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 text-xs font-bold text-slate-700 shadow-xs transition"
                >
                  <CalendarDays className="h-4 w-4 text-slate-500" />
                  <span>Apply for Leave</span>
                </Link>
              </div>
            </div>
          </section>
        </StaggerItem>
      </StaggerContainer>

      {/* 2. TOP METRIC CARDS (3 CLEAN EQUAL COLUMNS) */}
      <StaggerContainer className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {/* CARD 1: TODAY'S SHIFT */}
        <StaggerItem variant="card">
          <article className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                    <Timer size={18} />
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">Today&apos;s Work Hours</h3>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                    isCheckedIn
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${isCheckedIn ? "bg-emerald-500" : "bg-slate-400"}`} />
                  {isCheckedIn ? "Checked In" : "Pending"}
                </span>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-center">
                <p className="font-mono text-2xl font-bold tracking-wider text-slate-900">
                  {formatDuration(attendance?.workingMinutes)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Shift: <span className="font-semibold text-slate-700">09:30 AM – 06:30 PM</span>
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span className="truncate">
                  {attendance?.checkIn ? `Punched in at ${attendance.checkIn}` : "Not punched in yet"}
                </span>
                <span className="font-medium text-slate-600 shrink-0">Mumbai HQ</span>
              </div>
            </div>

            <Link
              to="/hrm/attendance"
              className="mt-4 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50/70 text-xs font-bold text-orange-700 transition hover:bg-orange-600 hover:text-white hover:border-orange-600"
            >
              <span>{isCheckedOut ? "View Attendance" : isCheckedIn ? "Punch Out" : "Punch In Now"}</span>
              <ArrowRight size={14} />
            </Link>
          </article>
        </StaggerItem>

        {/* CARD 2: MY LEAVE BALANCES */}
        <StaggerItem variant="card">
          <article className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Palmtree size={18} />
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">Leave Balances</h3>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                  Year {new Date().getFullYear()}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {balances.slice(0, 3).map((balance) => {
                  const percent = Math.min(100, Math.round(((balance.remaining ?? 0) / (balance.total || 1)) * 100));
                  const used = Math.max(0, Number(((balance.total ?? 0) - (balance.remaining ?? 0)).toFixed(1)));

                  return (
                    <div key={balance.leaveType} className="space-y-2.5">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700">{balance.leaveType}</span>
                          <span className="font-bold tabular-nums text-slate-900">
                            {balance.remaining}{" "}
                            <span className="font-normal text-slate-400">/ {balance.total} days</span>
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {balances.length === 1 && (
                        <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200/70 bg-slate-50/70 p-2.5 text-center">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Available</p>
                            <p className="text-sm font-bold tabular-nums text-emerald-600">{balance.remaining}</p>
                          </div>
                          <div className="border-x border-slate-200">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Used</p>
                            <p className="text-sm font-bold tabular-nums text-slate-700">{used}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Quota</p>
                            <p className="text-sm font-bold tabular-nums text-slate-700">{balance.total}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <Link
              to="/hrm/leave"
              className="mt-4 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 text-xs font-bold text-emerald-700 transition hover:bg-emerald-600 hover:text-white hover:border-emerald-600"
            >
              <span>Apply for Leave</span>
              <ArrowRight size={14} />
            </Link>
          </article>
        </StaggerItem>

        {/* CARD 3: MONTHLY ATTENDANCE TRACKER */}
        <StaggerItem variant="card">
          <article className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <UserCheck size={18} />
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">Attendance Log</h3>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                  {liveClock.toLocaleDateString(undefined, { month: "long" })}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <p className="text-2xl font-bold tracking-tight text-slate-900">
                      {counts.presentDaysThisMonth ?? 0}
                      <span className="text-xs font-medium text-slate-500 ml-1.5">Days Logged</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Today: <strong className="font-semibold text-slate-800">{formatHours(attendance?.workingMinutes)}</strong>
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 shrink-0">
                    <CheckCircle2 size={12} />
                    On Track
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium text-slate-600">
                    <span>Monthly Target (22 Days)</span>
                    <span className="font-bold text-blue-700">{Math.round(((counts.presentDaysThisMonth ?? 0) / 22) * 100)}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-500"
                      style={{
                        width: `${Math.min(100, ((counts.presentDaysThisMonth ?? 0) / 22) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Link
              to="/hrm/attendance"
              className="mt-4 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/70 text-xs font-bold text-blue-700 transition hover:bg-blue-600 hover:text-white hover:border-blue-600"
            >
              <span>View Detailed Log</span>
              <ArrowRight size={14} />
            </Link>
          </article>
        </StaggerItem>
      </StaggerContainer>

      {/* 3. MAIN DASHBOARD CONTENT GRID (2/3 MAIN + 1/3 SIDEBAR) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT / MAIN COLUMN (2 COLUMNS WIDE) */}
        <div className="space-y-6 lg:col-span-2">
          {/* WEEKLY ATTENDANCE ACTIVITY (LAST 5 WORKDAYS) */}
          <StaggerContainer>
            <StaggerItem variant="card">
              <section
                style={{
                  background: '#ffffff',
                  boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)',
                  border: '1px solid #f1f5f9',
                }}
                className="rounded-2xl p-5 sm:p-6"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      style={{ background: '#ecfdf5', color: '#059669' }}
                      className="flex h-9 w-9 items-center justify-center rounded-xl font-bold"
                    >
                      <CalendarCheck size={18} />
                    </span>
                    <div>
                      <h2 className="text-base font-black text-slate-900">Attendance Activity</h2>
                      <p className="text-xs text-slate-500">Log of your past {week.length} workdays</p>
                    </div>
                  </div>
                  <span
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569' }}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Standard 8h Shift Target
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5">
                  {week.map((day) => {
                    const dateInfo = shortDate(day.date);
                    const isPresent = day.status === "PRESENT";
                    const isWfh = day.status === "WORK_FROM_HOME";
                    const percent = Math.min(100, Math.round(((day.workingMinutes ?? 0) / 480) * 100));

                    return (
                      <div
                        key={day.date}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                        }}
                        className="flex flex-col justify-between rounded-xl p-3.5 transition-all duration-200 hover:-translate-y-1 hover:border-orange-300 hover:bg-white hover:shadow-md"
                      >
                        <div>
                          {/* Day & Date */}
                          <div className="flex items-baseline justify-between border-b border-slate-200/60 pb-1.5">
                            <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                              {dateInfo.dayName}
                            </span>
                            <span className="text-[11px] font-bold text-slate-500">
                              {dateInfo.month} {dateInfo.dayNum}
                            </span>
                          </div>

                          {/* Status Badge & Working Hours */}
                          <div className="mt-2.5 flex flex-col items-start gap-1.5">
                            <span
                              style={{
                                background: isPresent ? '#ecfdf5' : isWfh ? '#eff6ff' : '#fffbeb',
                                color: isPresent ? '#065f46' : isWfh ? '#1e40af' : '#92400e',
                                borderColor: isPresent ? '#a7f3d0' : isWfh ? '#bfdbfe' : '#fde68a',
                              }}
                              className="inline-flex rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wide border"
                            >
                              {day.status.replaceAll("_", " ")}
                            </span>

                            <span className="font-mono text-sm font-extrabold text-slate-900">
                              {formatHours(day.workingMinutes)}
                            </span>
                          </div>
                        </div>

                        {/* Shift Percentage Progress */}
                        <div className="mt-3 space-y-1">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${percent}%`,
                                background: isPresent
                                  ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                                  : isWfh
                                  ? 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)'
                                  : 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
                              }}
                            />
                          </div>
                          <p className="text-right text-[10px] font-extrabold text-slate-500">
                            {percent}% of shift
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </StaggerItem>
          </StaggerContainer>

          {/* COMPANY ANNOUNCEMENTS & CIRCULARS */}
          <StaggerContainer>
            <StaggerItem variant="card">
              <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                      <Star size={20} />
                    </span>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Company Announcements &amp; HR Updates
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Policy updates, holiday schedules, and published payslips.
                      </p>
                    </div>
                  </div>

                  <Link
                    to="/hrm/announcements"
                    className="shrink-0 inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-4 text-xs font-bold text-slate-700 transition"
                  >
                    <span>View Announcements</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </section>
            </StaggerItem>
          </StaggerContainer>
        </div>

        {/* RIGHT / SIDEBAR COLUMN (1 COLUMN WIDE - BIRTHDAYS & UPCOMING EVENTS) */}
        <div className="space-y-6">
          {/* UP NEXT / SCHEDULE & HOLIDAYS */}
          <StaggerContainer>
            <StaggerItem variant="card">
              <article
                style={{
                  background: '#ffffff',
                  boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)',
                  border: '1px solid #f1f5f9',
                }}
                className="rounded-2xl p-5.5"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      style={{ background: '#faf5ff', color: '#9333ea' }}
                      className="flex h-9 w-9 items-center justify-center rounded-xl font-bold"
                    >
                      <CalendarDays size={18} />
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Upcoming Schedule</h3>
                      <p className="text-[11px] text-slate-400">Events &amp; Holidays</p>
                    </div>
                  </div>
                  <span
                    style={{ background: '#faf5ff', color: '#7e22ce', border: '1px solid #e9d5ff' }}
                    className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                  >
                    Calendar
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {events && events.length > 0 ? (
                    events.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                        className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-purple-50/50"
                      >
                        <div
                          style={{ background: '#faf5ff', color: '#7e22ce' }}
                          className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl font-bold text-center border border-purple-200"
                        >
                          <span className="text-[9px] font-black uppercase leading-none">
                            {new Date(event.date).toLocaleDateString(undefined, { month: "short" })}
                          </span>
                          <span className="text-sm font-black leading-none mt-0.5">
                            {new Date(event.date).getDate()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-slate-900">{event.title}</p>
                          <p className="text-[11px] font-semibold text-slate-500 capitalize">{event.type}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 p-4 text-left">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                        <Sparkles size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">All caught up!</p>
                        <p className="text-[11px] text-slate-500">No pending events or holidays scheduled.</p>
                      </div>
                    </div>
                  )}
                </div>

                <Link
                  to="/hrm/announcements"
                  style={{
                    background: '#faf5ff',
                    borderColor: '#e9d5ff',
                    color: '#7e22ce',
                  }}
                  className="mt-4 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border text-xs font-extrabold transition-all hover:bg-purple-600 hover:text-white"
                >
                  <span>View Full Holiday Calendar</span>
                  <ArrowRight size={13} />
                </Link>
              </article>
            </StaggerItem>
          </StaggerContainer>

          {/* UPCOMING BIRTHDAYS (NATURAL COMPACT FIT IN SIDEBAR) */}
          <StaggerContainer>
            <StaggerItem variant="card">
              <BirthdayWidget />
            </StaggerItem>
          </StaggerContainer>

          {/* MANAGER TEAM SNAPSHOT (IF MANAGER) */}
          {isManager ? (
            <StaggerContainer>
              <StaggerItem variant="card">
                <section
                  style={{
                    background: '#ffffff',
                    boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)',
                    border: '1px solid #f1f5f9',
                  }}
                  className="rounded-2xl p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        style={{ background: '#fff7ed', color: '#ea580c' }}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold"
                      >
                        <Users size={18} />
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-sm font-black text-slate-900">Team Snapshot</h2>
                        <p className="text-xs text-slate-500">Live team status and shift visibility</p>
                      </div>
                    </div>
                    <Link
                      to="/hrm/attendance"
                      className="inline-flex h-8 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 hover:bg-slate-100"
                    >
                      <span>Team Attendance</span>
                      <ExternalLink size={12} />
                    </Link>
                  </div>
                </section>
              </StaggerItem>
            </StaggerContainer>
          ) : null}
        </div>
      </div>
    </DashboardLayout>
  );
}
