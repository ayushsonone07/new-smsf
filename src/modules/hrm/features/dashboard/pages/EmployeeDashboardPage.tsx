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
      {/* 1. RADIANT HERO HEADER CARD */}
      <StaggerContainer>
        <StaggerItem variant="card">
          <section
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #fff7ed 50%, #ffedd5 100%)',
              borderColor: 'rgba(251, 146, 60, 0.35)',
              boxShadow: '0 10px 25px -5px rgba(249, 115, 22, 0.08), 0 8px 10px -6px rgba(249, 115, 22, 0.05)',
            }}
            className="relative overflow-hidden rounded-2xl border p-6 transition-all"
          >
            {/* Ambient Background Radial Glows */}
            <div
              style={{
                position: 'absolute',
                top: '-40px',
                right: '-40px',
                width: '260px',
                height: '260px',
                background: 'radial-gradient(circle, rgba(249,115,22,0.18) 0%, rgba(255,255,255,0) 70%)',
                pointerEvents: 'none',
              }}
            />

            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              {/* Left: Avatar, Name & Live Meta */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 min-w-0">
                <div className="relative shrink-0">
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fb923c 100%)',
                      boxShadow: '0 8px 20px -4px rgba(234, 88, 12, 0.4)',
                    }}
                    className="flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-black text-white ring-4 ring-orange-500/15"
                  >
                    {getInitials(employee.name)}
                  </div>
                  <span
                    className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ring-2 ${
                      isCheckedIn
                        ? "bg-emerald-500 ring-emerald-500/30 animate-pulse"
                        : "bg-amber-400 ring-amber-400/30"
                    }`}
                    title={isCheckedIn ? "Checked In" : "Pending Check-In"}
                  />
                </div>

                <div className="min-w-0">
                  {/* Greeting & Date Header */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      style={{
                        background: 'rgba(255, 237, 213, 0.9)',
                        color: '#c2410c',
                        border: '1px solid rgba(251, 146, 60, 0.4)',
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-bold"
                    >
                      <GreetingIcon className="h-3.5 w-3.5" />
                      <span>{greeting.text}</span>
                    </span>
                    <span className="text-xs font-semibold text-slate-400">•</span>
                    <span className="text-xs font-semibold text-slate-600">
                      {liveClock.toLocaleDateString(undefined, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    {refreshButton}
                  </div>

                  {/* Employee Name */}
                  <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                    {employee.name}
                  </h1>

                  {/* Department & Location */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-md bg-white/80 px-2.5 py-0.5 font-bold text-slate-800 border border-orange-200 shadow-xs">
                      <Briefcase size={12} className="text-orange-600" />
                      {employee.department ?? "Technology Department"}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                      <MapPin size={13} className="text-orange-600" />
                      Mumbai HQ
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="inline-flex items-center gap-1 font-mono font-bold text-orange-900 bg-orange-100/70 px-2 py-0.5 rounded-md">
                      <Clock size={12} className="text-orange-600" />
                      {liveClock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </div>

                  {/* Clean High-Contrast Stat Chips */}
                  <div className="mt-3.5 flex flex-wrap gap-2.5">
                    <span
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        color: '#0f172a',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold"
                    >
                      <ListTodo size={14} className="text-blue-600" />
                      <span>
                        <strong className="font-extrabold text-blue-700">{counts.pendingTasks ?? 0}</strong> pending task
                        {(counts.pendingTasks ?? 0) === 1 ? "" : "s"}
                      </span>
                    </span>

                    <span
                      style={{
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        color: '#92400e',
                        boxShadow: '0 1px 3px rgba(180, 83, 9, 0.05)',
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold"
                    >
                      <Clock size={14} className="text-amber-600" />
                      <span>
                        <strong className="font-extrabold text-amber-800">{counts.pendingLeaveRequests ?? 0}</strong> leave requests pending
                      </span>
                    </span>

                    <span
                      style={{
                        background: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        color: '#065f46',
                        boxShadow: '0 1px 3px rgba(5, 150, 105, 0.05)',
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold"
                    >
                      <CalendarCheck size={14} className="text-emerald-600" />
                      <span>
                        <strong className="font-extrabold text-emerald-800">{counts.presentDaysThisMonth ?? 0}</strong> days present this month
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Primary Action Buttons */}
              <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-orange-200/60 pt-4 lg:border-0 lg:pt-0">
                <Link
                  to="/hrm/attendance"
                  style={{
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    boxShadow: '0 4px 14px rgba(234, 88, 12, 0.35)',
                  }}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-xs font-extrabold text-white transition-all hover:scale-[1.02] hover:brightness-105 active:scale-[0.98]"
                >
                  <Clock className="h-4 w-4" />
                  <span>{isCheckedOut ? "View Attendance" : isCheckedIn ? "Punch Out / Check" : "Log Attendance"}</span>
                </Link>

                <Link
                  to="/hrm/leave"
                  style={{
                    background: '#ffffff',
                    border: '1px solid #fdba74',
                    color: '#c2410c',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  }}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-xs font-extrabold transition-all hover:bg-orange-50 active:scale-[0.98]"
                >
                  <CalendarDays className="h-4 w-4 text-orange-600" />
                  <span>Apply For Leave</span>
                </Link>
              </div>
            </div>
          </section>
        </StaggerItem>
      </StaggerContainer>

      {/* 2. TOP METRIC CARDS (3 BALANCED COLUMNS) */}
      <StaggerContainer className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {/* CARD 1: TODAY'S SHIFT */}
        <StaggerItem variant="card">
          <article
            style={{
              background: '#ffffff',
              boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)',
              border: '1px solid #f1f5f9',
            }}
            className="group flex h-full min-h-[240px] flex-col justify-between rounded-2xl p-5.5 transition-all duration-200 hover:-translate-y-1 hover:border-orange-300 hover:shadow-lg"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    style={{ background: '#fff7ed', color: '#ea580c' }}
                    className="flex h-10 w-10 items-center justify-center rounded-xl font-bold"
                  >
                    <Timer size={20} />
                  </span>
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                      Shift Tracker
                    </span>
                    <h3 className="text-sm font-bold text-slate-800">Today&apos;s Work Hours</h3>
                  </div>
                </div>
                <span
                  style={{
                    background: isCheckedIn ? '#ecfdf5' : '#f8fafc',
                    color: isCheckedIn ? '#047857' : '#64748b',
                    borderColor: isCheckedIn ? '#a7f3d0' : '#e2e8f0',
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold border"
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isCheckedIn ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                    }`}
                  />
                  {isCheckedIn ? "Checked In" : "Pending"}
                </span>
              </div>

              {/* Digital Timer Display Box */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                  border: '1px solid #fed7aa',
                }}
                className="mt-4 rounded-xl p-3.5 text-center"
              >
                <p className="font-mono text-3xl font-black tracking-wider text-orange-950">
                  {formatDuration(attendance?.workingMinutes)}
                </p>
                <p className="mt-1 text-xs font-semibold text-orange-800">
                  Standard Shift: <span className="font-extrabold">09:30 AM – 06:30 PM</span>
                </p>
              </div>

              <div className="mt-3.5 flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold truncate">
                  {attendance?.checkIn ? `Punched in at ${attendance.checkIn}` : "Not punched in yet"}
                </span>
                <span className="font-bold text-slate-800 shrink-0 bg-slate-100 px-2 py-0.5 rounded-md">
                  Mumbai HQ
                </span>
              </div>
            </div>

            <Link
              to="/hrm/attendance"
              style={{
                background: '#fff7ed',
                borderColor: '#fed7aa',
                color: '#c2410c',
              }}
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border text-xs font-extrabold transition-all hover:bg-orange-500 hover:text-white hover:border-orange-500"
            >
              <span>{isCheckedOut ? "View Attendance Record" : isCheckedIn ? "Punch Out / Check Status" : "Punch In Now"}</span>
              <ArrowRight size={14} />
            </Link>
          </article>
        </StaggerItem>

        {/* CARD 2: MY LEAVE BALANCES */}
        <StaggerItem variant="card">
          <article
            style={{
              background: '#ffffff',
              boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)',
              border: '1px solid #f1f5f9',
            }}
            className="group flex h-full min-h-[240px] flex-col justify-between rounded-2xl p-5.5 transition-all duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    style={{ background: '#ecfdf5', color: '#059669' }}
                    className="flex h-10 w-10 items-center justify-center rounded-xl font-bold"
                  >
                    <Palmtree size={20} />
                  </span>
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                      Leave Quota
                    </span>
                    <h3 className="text-sm font-bold text-slate-800">Leave Balances</h3>
                  </div>
                </div>
                <span
                  style={{ background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }}
                  className="rounded-full border px-2.5 py-0.5 text-xs font-bold"
                >
                  Year 2026
                </span>
              </div>

              {/* Leave Breakdown with Thick Radiant Bars */}
              <div className="mt-4 space-y-3">
                {balances.slice(0, 3).map((balance, idx) => {
                  const percent = Math.min(100, Math.round(((balance.remaining ?? 0) / (balance.total || 1)) * 100));
                  const barGradients = [
                    "linear-gradient(90deg, #6366f1 0%, #4f46e5 100%)",
                    "linear-gradient(90deg, #10b981 0%, #059669 100%)",
                    "linear-gradient(90deg, #f59e0b 0%, #d97706 100%)",
                  ];
                  const barBg = barGradients[idx % barGradients.length];

                  return (
                    <div key={balance.leaveType} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">{balance.leaveType}</span>
                        <span className="font-black tabular-nums text-slate-900">
                          {balance.remaining}{" "}
                          <span className="font-normal text-slate-400">/ {balance.total} days</span>
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${percent}%`, background: barBg }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Link
              to="/hrm/leave"
              style={{
                background: '#ecfdf5',
                borderColor: '#a7f3d0',
                color: '#047857',
              }}
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border text-xs font-extrabold transition-all hover:bg-emerald-600 hover:text-white hover:border-emerald-600"
            >
              <span>Apply For Leave</span>
              <ArrowRight size={14} />
            </Link>
          </article>
        </StaggerItem>

        {/* CARD 3: MONTHLY ATTENDANCE TRACKER */}
        <StaggerItem variant="card">
          <article
            style={{
              background: '#ffffff',
              boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)',
              border: '1px solid #f1f5f9',
            }}
            className="group flex h-full min-h-[240px] flex-col justify-between rounded-2xl p-5.5 transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    style={{ background: '#eff6ff', color: '#2563eb' }}
                    className="flex h-10 w-10 items-center justify-center rounded-xl font-bold"
                  >
                    <UserCheck size={20} />
                  </span>
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                      Monthly Summary
                    </span>
                    <h3 className="text-sm font-bold text-slate-800">Attendance Log</h3>
                  </div>
                </div>
                <span
                  style={{ background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}
                  className="rounded-full border px-2.5 py-0.5 text-xs font-bold"
                >
                  {liveClock.toLocaleDateString(undefined, { month: "long" })}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <p className="text-3xl font-black tracking-tight text-slate-900">
                      {counts.presentDaysThisMonth ?? 0}
                      <span className="text-xs font-bold text-slate-500 ml-1.5">Days Logged</span>
                    </p>
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      Logged today: <strong className="text-slate-900">{formatHours(attendance?.workingMinutes)}</strong>
                    </p>
                  </div>
                  <span
                    style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}
                    className="inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-full shrink-0"
                  >
                    <CheckCircle2 size={13} />
                    On Track
                  </span>
                </div>

                {/* Monthly Progress Meter */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-600">
                    <span>Monthly Target (22 Days)</span>
                    <span className="text-blue-700">{Math.round(((counts.presentDaysThisMonth ?? 0) / 22) * 100)}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, ((counts.presentDaysThisMonth ?? 0) / 22) * 100)}%`,
                        background: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Link
              to="/hrm/attendance"
              style={{
                background: '#eff6ff',
                borderColor: '#bfdbfe',
                color: '#1d4ed8',
              }}
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border text-xs font-extrabold transition-all hover:bg-blue-600 hover:text-white hover:border-blue-600"
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
                          <div className="mt-2.5 flex items-center justify-between gap-1">
                            <span
                              style={{
                                background: isPresent ? '#ecfdf5' : isWfh ? '#eff6ff' : '#fffbeb',
                                color: isPresent ? '#065f46' : isWfh ? '#1e40af' : '#92400e',
                                borderColor: isPresent ? '#a7f3d0' : isWfh ? '#bfdbfe' : '#fde68a',
                              }}
                              className="inline-flex rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide border shrink-0"
                            >
                              {day.status.replaceAll("_", " ")}
                            </span>

                            <span className="font-mono text-xs font-extrabold text-slate-900 shrink-0">
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
              <section
                style={{
                  background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #ffffff 100%)',
                  border: '1px solid #fde68a',
                  boxShadow: '0 4px 15px -2px rgba(217, 119, 6, 0.08)',
                }}
                className="relative overflow-hidden rounded-2xl p-5 transition-all"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <span
                      style={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                        boxShadow: '0 4px 12px rgba(234, 88, 12, 0.3)',
                      }}
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white font-bold"
                    >
                      <Star size={22} fill="currentColor" className="text-amber-100" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}
                          className="rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wider"
                        >
                          Company Circulars
                        </span>
                        <h2 className="text-base font-black text-slate-900">
                          Company Announcements &amp; HR Updates
                        </h2>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
                        Check out policy announcements, holiday schedules, and published payslips.
                      </p>
                    </div>
                  </div>

                  <Link
                    to="/hrm/announcements"
                    style={{
                      background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
                      boxShadow: '0 4px 12px rgba(234, 88, 12, 0.3)',
                    }}
                    className="shrink-0 inline-flex h-10 items-center justify-center gap-2 rounded-xl px-5 text-xs font-black text-white transition-all hover:scale-[1.02] hover:brightness-105 active:scale-95"
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        style={{ background: '#fff7ed', color: '#ea580c' }}
                        className="flex h-9 w-9 items-center justify-center rounded-xl font-bold"
                      >
                        <Users size={18} />
                      </span>
                      <div>
                        <h2 className="text-sm font-black text-slate-900">Team Snapshot</h2>
                        <p className="text-xs text-slate-500">Live team status and shift visibility</p>
                      </div>
                    </div>
                    <Link
                      to="/hrm/attendance"
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 hover:bg-slate-100"
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
