import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bell,
  Calendar,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  Gift,
  HelpCircle,
  ListTodo,
  MapPin,
  Moon,
  Palmtree,
  Sparkles,
  Star,
  Sun,
  Sunrise,
  Sunset,
  Timer,
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
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
      className={`space-y-5 transition-opacity ${
        dashboardQuery.isFetching && !isLoading ? "pointer-events-none opacity-60" : ""
      }`}
    >
      {/* 1. HERO WELCOME BANNER */}
      <StaggerContainer>
        <StaggerItem variant="card">
          <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-primary/5 p-5 shadow-sm sm:p-6 transition-all hover:shadow-md">
            {/* Ambient Background Glows */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 right-1/4 h-36 w-36 rounded-full bg-orange-500/10 blur-3xl" />

            <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              {/* Left Profile & Welcome */}
              <div className="flex items-start gap-4">
                <div className="relative shrink-0">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-orange-500 text-lg font-bold text-primary-foreground shadow-md shadow-primary/20 sm:h-16 sm:w-16 sm:text-xl">
                    {getInitials(employee.name)}
                  </div>
                  <span
                    className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-card ${
                      isCheckedIn ? "bg-emerald-500" : "bg-amber-400"
                    }`}
                    title={isCheckedIn ? "Checked In" : "Not Checked In"}
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/25 bg-orange-500/10 px-2.5 py-0.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
                      <GreetingIcon className="h-3.5 w-3.5" />
                      {greeting.text}
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {liveClock.toLocaleDateString(undefined, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    {refreshButton}
                  </div>

                  <h1 className="mt-1.5 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                    {employee.name}
                  </h1>

                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground/80">
                      {employee.department ?? "Technology Department"}
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={12} className="text-primary" />
                      Mumbai HQ
                    </span>
                    <span>•</span>
                    <span className="font-mono text-muted-foreground/80">
                      {liveClock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </div>

                  {/* Quick Stat Badges */}
                  <div className="mt-3.5 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-muted/60 px-2.5 py-1 text-xs font-medium text-foreground">
                      <ListTodo size={13} className="text-primary" />
                      <span>
                        <strong className="font-semibold">{counts.pendingTasks ?? 0}</strong> pending task
                        {(counts.pendingTasks ?? 0) === 1 ? "" : "s"}
                      </span>
                    </span>

                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-50/70 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                      <Clock size={13} className="text-amber-600 dark:text-amber-400" />
                      <span>
                        <strong className="font-semibold">{counts.pendingLeaveRequests ?? 0}</strong> leave request pending
                      </span>
                    </span>

                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-50/70 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                      <CalendarCheck size={13} className="text-emerald-600 dark:text-emerald-400" />
                      <span>
                        <strong className="font-semibold">{counts.presentDaysThisMonth ?? 0}</strong> days present this month
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Quick Actions */}
              <div className="flex shrink-0 flex-wrap items-center gap-2.5 border-t border-border/60 pt-4 sm:border-0 sm:pt-0">
                <Link
                  to="/hrm/attendance"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/25 transition-all hover:bg-primary-hover hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Clock className="h-4 w-4" />
                  {isCheckedOut ? "View Attendance" : isCheckedIn ? "Punch Out / Check" : "Log Attendance"}
                </Link>

                <Link
                  to="/hrm/leave"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-bold text-foreground shadow-sm transition-all hover:bg-surface-hover hover:border-primary/40 active:scale-[0.98]"
                >
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Apply For Leave
                </Link>
              </div>
            </div>
          </section>
        </StaggerItem>
      </StaggerContainer>

      {/* 2. TOP GRID: 4 BALANCED CARDS */}
      <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* CARD 1: TODAY'S SHIFT & LIVE TRACKER */}
        <StaggerItem variant="card">
          <article className="group flex h-full min-h-[220px] flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                    <Timer size={17} />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Today&apos;s Shift
                  </span>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    isCheckedIn
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isCheckedIn ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/60"
                    }`}
                  />
                  {isCheckedIn ? "Checked In" : "Pending"}
                </span>
              </div>

              {/* Digital Timer Display */}
              <div className="mt-4 rounded-xl border border-border/60 bg-surface-muted/40 p-3 text-center transition-colors group-hover:bg-primary/5">
                <p className="font-mono text-3xl font-extrabold tracking-tight text-foreground">
                  {formatDuration(attendance?.workingMinutes)}
                </p>
                <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                  Shift Timing: <span className="font-semibold text-foreground">09:30 – 18:30</span>
                </p>
              </div>

              <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground">
                <span className="truncate">
                  {attendance?.checkIn ? `Checked in at ${attendance.checkIn}` : "Not logged in yet"}
                </span>
                <span className="font-medium text-foreground/80">Mumbai HQ</span>
              </div>
            </div>

            <Link
              to="/hrm/attendance"
              className="mt-4 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 text-xs font-bold text-primary transition-all hover:bg-primary hover:text-primary-foreground"
            >
              <span>{isCheckedOut ? "View Attendance" : isCheckedIn ? "Manage Attendance" : "Log Attendance"}</span>
              <ArrowRight size={13} />
            </Link>
          </article>
        </StaggerItem>

        {/* CARD 2: MY LEAVE BALANCES */}
        <StaggerItem variant="card">
          <article className="group flex h-full min-h-[220px] flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-md">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Palmtree size={17} />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Leave Balance
                  </span>
                </div>
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  Active Year
                </span>
              </div>

              {/* Leave Breakdown with Progress Bars */}
              <div className="mt-3.5 space-y-2.5">
                {balances.slice(0, 3).map((balance, idx) => {
                  const percent = Math.min(100, Math.round(((balance.remaining ?? 0) / (balance.total || 1)) * 100));
                  const colors = [
                    "bg-indigo-500",
                    "bg-emerald-500",
                    "bg-amber-500",
                  ];
                  const barColor = colors[idx % colors.length];

                  return (
                    <div key={balance.leaveType} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground/90">{balance.leaveType}</span>
                        <span className="font-bold tabular-nums text-foreground">
                          {balance.remaining}{" "}
                          <span className="font-normal text-muted-foreground">/ {balance.total} days</span>
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Link
              to="/hrm/leave"
              className="mt-4 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-xs font-bold text-emerald-700 transition-all hover:bg-emerald-600 hover:text-white dark:text-emerald-300"
            >
              <span>Apply For Leave</span>
              <ArrowRight size={13} />
            </Link>
          </article>
        </StaggerItem>

        {/* CARD 3: MONTHLY ATTENDANCE STATS (BALANCING THE GRID) */}
        <StaggerItem variant="card">
          <article className="group flex h-full min-h-[220px] flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-500/30 hover:shadow-md">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <UserCheck size={17} />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Monthly Tracker
                  </span>
                </div>
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                  {liveClock.toLocaleDateString(undefined, { month: "short" })}
                </span>
              </div>

              <div className="mt-3.5 space-y-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-2xl font-black tracking-tight text-foreground">
                      {counts.presentDaysThisMonth ?? 0}
                      <span className="text-xs font-normal text-muted-foreground ml-1">Days Logged</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Logged today: <strong className="text-foreground">{formatHours(attendance?.workingMinutes)}</strong>
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={13} />
                    On Track
                  </span>
                </div>

                {/* Progress bar towards standard 22 working days */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Monthly Progress</span>
                    <span>{Math.round(((counts.presentDaysThisMonth ?? 0) / 22) * 100)}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, ((counts.presentDaysThisMonth ?? 0) / 22) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Link
              to="/hrm/attendance"
              className="mt-4 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/5 text-xs font-bold text-blue-700 transition-all hover:bg-blue-600 hover:text-white dark:text-blue-300"
            >
              <span>View Attendance Log</span>
              <ArrowRight size={13} />
            </Link>
          </article>
        </StaggerItem>

        {/* CARD 4: UP NEXT (EVENTS & SCHEDULE) */}
        <StaggerItem variant="card">
          <article className="group flex h-full min-h-[220px] flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-purple-500/30 hover:shadow-md">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <CalendarDays size={17} />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Up Next
                  </span>
                </div>
                <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                  Schedule
                </span>
              </div>

              <div className="mt-3.5 space-y-2.5">
                {events.length > 0 ? (
                  events.slice(0, 2).map((event) => (
                    <div key={event.id} className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-surface-muted/30 p-2.5">
                      <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <span className="text-[10px] font-bold uppercase leading-none">
                          {new Date(event.date).toLocaleDateString(undefined, { month: "short" })}
                        </span>
                        <span className="text-xs font-black leading-none mt-0.5">
                          {new Date(event.date).getDate()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-foreground">{event.title}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{event.type}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-dashed border-border p-3 text-left">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-muted-foreground">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">All caught up!</p>
                      <p className="text-[11px] text-muted-foreground">No pending events scheduled.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Link
              to="/hrm/announcements"
              className="mt-4 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-500/5 text-xs font-bold text-purple-700 transition-all hover:bg-purple-600 hover:text-white dark:text-purple-300"
            >
              <span>View Holiday Calendar</span>
              <ArrowRight size={13} />
            </Link>
          </article>
        </StaggerItem>
      </StaggerContainer>

      {/* 3. ANNOUNCEMENTS & HR NOTICES */}
      <StaggerContainer>
        <StaggerItem variant="card">
          <section className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-card to-card p-4 sm:p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20">
                  <Star size={22} fill="currentColor" className="text-amber-100" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                      Company Circulars
                    </span>
                    <h2 className="text-base font-extrabold text-foreground">
                      Company Announcements &amp; HR Updates
                    </h2>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Check out recent policy announcements, holiday schedules, organizational notices, and published payslips.
                  </p>
                </div>
              </div>

              <Link
                to="/hrm/announcements"
                className="shrink-0 inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 text-xs font-bold text-white shadow-md shadow-orange-500/20 transition-all hover:brightness-110 active:scale-95"
              >
                <span>View Announcements</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </section>
        </StaggerItem>
      </StaggerContainer>

      {/* 4. BIRTHDAYS & CELEBRATIONS */}
      <StaggerContainer>
        <StaggerItem variant="card">
          <BirthdayWidget />
        </StaggerItem>
      </StaggerContainer>

      {/* 5. MANAGER TEAM SNAPSHOT (IF MANAGER) */}
      {isManager ? (
        <StaggerContainer>
          <StaggerItem variant="card">
            <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Users size={18} />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-foreground">Team Snapshot</h2>
                    <p className="text-xs text-muted-foreground">Live team status and shift visibility</p>
                  </div>
                </div>
                <Link
                  to="/hrm/attendance"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-muted/60 px-3 text-xs font-semibold text-foreground hover:bg-surface-hover"
                >
                  <span>Team Attendance</span>
                  <ExternalLink size={12} />
                </Link>
              </div>
            </section>
          </StaggerItem>
        </StaggerContainer>
      ) : null}

      {/* 6. WEEKLY ATTENDANCE HEATMAP */}
      <StaggerContainer>
        <StaggerItem variant="card">
          <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CalendarCheck size={18} />
                </span>
                <div>
                  <h2 className="text-base font-bold text-foreground">Attendance Activity</h2>
                  <p className="text-xs text-muted-foreground">Log of your past {week.length} workdays</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Standard 8h Shift Target
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {week.map((day) => {
                const dateInfo = shortDate(day.date);
                const isPresent = day.status === "PRESENT";
                const isWfh = day.status === "WORK_FROM_HOME";
                const percent = Math.min(100, Math.round(((day.workingMinutes ?? 0) / 480) * 100));

                return (
                  <div
                    key={day.date}
                    className="flex flex-col justify-between rounded-xl border border-border/70 bg-surface-muted/20 p-3.5 transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:bg-card hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs font-extrabold uppercase tracking-wide text-foreground">
                          {dateInfo.dayName}
                        </span>
                        <span className="text-[11px] font-bold text-muted-foreground">
                          {dateInfo.month} {dateInfo.dayNum}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
                            isPresent
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : isWfh
                              ? "bg-blue-50 text-blue-700 border border-blue-500/20 dark:bg-blue-950/40 dark:text-blue-300"
                              : "bg-amber-50 text-amber-700 border border-amber-500/20 dark:bg-amber-950/40 dark:text-amber-300"
                          }`}
                        >
                          {day.status.replaceAll("_", " ")}
                        </span>

                        <span className="font-mono text-xs font-bold text-foreground">
                          {formatHours(day.workingMinutes)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3.5 space-y-1">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isPresent ? "bg-emerald-500" : isWfh ? "bg-blue-500" : "bg-amber-500"
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <p className="text-right text-[10px] text-muted-foreground">
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
    </DashboardLayout>
  );
}
