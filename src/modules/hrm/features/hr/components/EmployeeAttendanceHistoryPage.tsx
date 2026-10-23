import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Grid3X3,
  List,
  Loader2,
  Search,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { ROUTES } from "@shared/constants";
import { getApiErrorMessage } from "@shared/lib";

import { employeeAttendanceService } from "../services/employeeAttendanceService";

import type {
  AttendanceRecord,
  AttendanceStatus,
  EmployeeAttendanceMonthlyResponse,
} from "../types";

type ViewMode = "calendar" | "list";
type StatusFilter = "" | AttendanceStatus;

type CalendarCell = {
  date: Date | null;
  dayNumber: number | null;
  record: AttendanceRecord | null;
  isWeekend: boolean;
};

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const STATUS_OPTIONS: Array<{ value: AttendanceStatus; label: string }> = [
  { value: "PRESENT", label: "Present" },
  { value: "ABSENT", label: "Absent" },
  { value: "HALF_DAY", label: "Half Day" },
  { value: "WORK_FROM_HOME", label: "Work From Home" },
  { value: "ON_LEAVE", label: "On Leave" },
];
const STATUS_META = {
  PRESENT: {
    label: "Present",
    text: "text-success",
    bg: "bg-success-soft",
    border: "border-success/30",
    dot: "bg-success",
  },
  ABSENT: {
    label: "Absent",
    text: "text-danger",
    bg: "bg-danger-soft",
    border: "border-danger/30",
    dot: "bg-danger",
  },
  HALF_DAY: {
    label: "Half Day",
    text: "text-warning",
    bg: "bg-warning-soft",
    border: "border-warning/30",
    dot: "bg-warning",
  },
  WORK_FROM_HOME: {
    label: "Work From Home",
    text: "text-info",
    bg: "bg-info-soft",
    border: "border-info/30",
    dot: "bg-info",
  },
  ON_LEAVE: {
    label: "On Leave",
    text: "text-info",
    bg: "bg-info-soft",
    border: "border-info/30",
    dot: "bg-info",
  },
} satisfies Record<
  AttendanceStatus,
  { label: string; text: string; bg: string; border: string; dot: string }
>;

export function EmployeeAttendanceHistoryPage() {
  const params = useParams();
  const employeeId = Number(params.employeeId);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const month = visibleMonth.getMonth() + 1;
  const year = visibleMonth.getFullYear();

  const query = useQuery({
    queryKey: ["hr", "employee-attendance-history", employeeId, month, year],
    queryFn: () => employeeAttendanceService.getMonthlyHistory(employeeId, month, year),
    enabled: Number.isFinite(employeeId) && employeeId > 0,
  });

  const data = query.data;
  const records = data?.records ?? [];
  const filteredRecords = useMemo(
    () => filterRecords(records, search, statusFilter),
    [records, search, statusFilter],
  );
  const cells = useMemo(() => buildCalendarCells(visibleMonth, records), [visibleMonth, records]);

  function shiftMonth(delta: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  return (
    <div className="min-h-full bg-background px-0 py-0 text-foreground print:bg-card">
      <div className="mx-auto max-w-[1120px] space-y-4 print:max-w-none print:space-y-3">
        <div className="flex items-center justify-between gap-3 print:hidden">
          <Link
            to={ROUTES.attendance}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground print:hidden"
          >
            <ArrowLeft size={15} />
            Back to Attendance
          </Link>
          <button
            type="button"
            onClick={() => data && exportPdf(data, visibleMonth)}
            disabled={!data || query.isLoading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-[13px] font-semibold text-card-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60 print:hidden"
          >
            <Download size={15} />
            Export PDF
          </button>
        </div>

        {query.isLoading ? (
          <LoadingState />
        ) : query.error ? (
          <ErrorState message={getApiErrorMessage(query.error)} />
        ) : data ? (
          <>
            <EmployeeHeader data={data} />
            <StatsRow data={data} />
            <ControlsBar
              visibleMonth={visibleMonth}
              search={search}
              statusFilter={statusFilter}
              viewMode={viewMode}
              onPrev={() => shiftMonth(-1)}
              onNext={() => shiftMonth(1)}
              onSearch={setSearch}
              onStatusFilter={setStatusFilter}
              onViewMode={setViewMode}
            />
            {viewMode === "calendar" ? (
              <CalendarCard cells={cells} />
            ) : (
              <ListCard records={filteredRecords} />
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  const second = parts[1] ?? "";
  if (!first) return "--";
  if (!second) return first.slice(0, 2).toUpperCase();
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
}
function EmployeeHeader({ data }: { data: EmployeeAttendanceMonthlyResponse }) {
  const employee = data.employee;
  const initials = getInitials(employee.name);
  return (
    <section className="flex items-center gap-3">
      <div className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-[#1d4ed8] text-base font-bold text-white shadow">
        {initials}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[18px] font-bold leading-tight text-foreground">{employee.name}</h1>
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold uppercase text-primary ring-1 ring-primary/30">
            {employee.employeeCode} - {employee.departmentName ?? "No Department"}
          </span>
        </div>
        <p className="mt-1 text-[13px] font-medium text-card-foreground">
          {employee.designationName ?? "Employee"} - Joined {formatShortDate(employee.joiningDate)}
        </p>
      </div>
    </section>
  );
}

function StatsRow({ data }: { data: EmployeeAttendanceMonthlyResponse }) {
  const summary = data.summary;
  const stats = [
    {
      label: "ATTENDANCE",
      value: `${summary.attendancePercentage}%`,
      sub: `${summary.totalWorkingDays} working days`,
      color: "text-primary",
    },
    { label: "PRESENT", value: summary.presentCount, color: "text-success" },
    { label: "ABSENT", value: summary.absentCount, color: "text-danger" },
    { label: "HALF DAY", value: summary.halfDayCount, color: "text-warning" },
    { label: "WORK FROM HOME", value: summary.workFromHomeCount, color: "text-info" },
    { label: "ON LEAVE", value: summary.onLeaveCount, color: "text-info" },
  ];
  return (
    <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6 print:grid-cols-6 print:gap-2">
      {stats.map((stat) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          whileHover={{ y: -2 }}
          className="h-[76px] rounded-[7px] border border-border bg-card px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-[0_6px_16px_rgba(15,23,42,0.08)] print:h-[72px] print:px-3 print:py-2"
        >
          <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
            {stat.label}
          </p>
          <p className={`mt-1.5 text-[19px] font-bold leading-none ${stat.color}`}>{stat.value}</p>
          {stat.sub ? (
            <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground">{stat.sub}</p>
          ) : null}
        </motion.div>
      ))}
    </section>
  );
}

function ControlsBar({
  visibleMonth,
  search,
  statusFilter,
  viewMode,
  onPrev,
  onNext,
  onSearch,
  onStatusFilter,
  onViewMode,
}: {
  visibleMonth: Date;
  search: string;
  statusFilter: StatusFilter;
  viewMode: ViewMode;
  onPrev: () => void;
  onNext: () => void;
  onSearch: (value: string) => void;
  onStatusFilter: (value: StatusFilter) => void;
  onViewMode: (mode: ViewMode) => void;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-[8px] border border-border bg-card px-4 py-3 shadow-[0_1px_1px_rgba(15,23,42,0.02)] lg:flex-row lg:items-center lg:justify-between print:hidden">
      <div className="flex h-9 items-center gap-7 text-card-foreground">
        <IconButton label="Previous month" onClick={onPrev}>
          <ChevronLeft size={16} />
        </IconButton>
        <div className="flex min-w-[135px] items-center justify-center gap-2 text-[13px] font-bold text-card-foreground">
          <CalendarDays size={14} className="text-muted-foreground" />
          {visibleMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </div>
        <IconButton label="Next month" onClick={onNext}>
          <ChevronRight size={16} />
        </IconButton>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={14}
          />
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search day..."
            className="h-9 w-full rounded-md border border-border bg-card pl-9 pr-3 text-[13px] font-medium text-card-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-[150px]"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(event) => onStatusFilter(event.target.value as StatusFilter)}
          className="mbg-filter-control h-9 rounded-md border border-border bg-card px-3 text-[13px] font-semibold text-card-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-[190px]"
        >
          <option value="">All</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
        <div className="inline-flex h-9 w-fit overflow-hidden rounded-md bg-surface-muted p-1">
          <ToggleButton
            active={viewMode === "calendar"}
            label="Calendar view"
            onClick={() => onViewMode("calendar")}
          >
            <Grid3X3 size={15} />
          </ToggleButton>
          <ToggleButton
            active={viewMode === "list"}
            label="List view"
            onClick={() => onViewMode("list")}
          >
            <List size={15} />
          </ToggleButton>
        </div>
      </div>
    </section>
  );
}

function CalendarCard({ cells }: { cells: CalendarCell[] }) {
  return (
    <section className="rounded-[8px] border border-border bg-card px-4 py-4 shadow-[0_1px_1px_rgba(15,23,42,0.02)] print:px-4 print:py-4">
      <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold uppercase text-primary sm:gap-2">
        {WEEKDAYS.map((day) => (
          <div key={day} className="pb-1.5">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {cells.map((cell, index) => (
          <DayCell key={cell.date?.toISOString() ?? `blank-${index}`} cell={cell} />
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-3">
        {STATUS_OPTIONS.map((status) => (
          <span
            key={status.value}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-card-foreground"
          >
            <span className={`h-2 w-2 rounded-full ${STATUS_META[status.value].dot}`} />
            {status.label}
          </span>
        ))}
      </div>
    </section>
  );
}

function DayCell({ cell }: { cell: CalendarCell }) {
  if (!cell.date || !cell.dayNumber) return <div className="aspect-square min-h-[32px]" />;
  const status = cell.record?.status ?? null;
  const meta = status ? STATUS_META[status] : null;
  const checkIn = formatTime(cell.record?.checkIn ?? null);
  const checkOut = formatTime(cell.record?.checkOut ?? null);
  const classes = meta
      ? `${meta.bg} ${meta.border} ${meta.text}`
    : cell.isWeekend
      ? "border-border bg-surface-muted text-muted-foreground"
      : "border-border bg-card text-card-foreground";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18, delay: Math.min((cell.dayNumber ?? 1) * 0.008, 0.18) }}
      whileHover={{ y: -2, scale: 1.015 }}
      title={
        cell.record
          ? `${meta?.label ?? "Attendance"} · Check-in: ${checkIn} · Check-out: ${checkOut}`
          : undefined
      }
      className={`flex aspect-square min-h-[36px] flex-col items-center justify-center rounded-[6px] border px-0.5 py-1 ${classes} shadow-[0_1px_1px_rgba(15,23,42,0.03)] transition-shadow hover:shadow-[0_8px_18px_rgba(15,23,42,0.10)] sm:min-h-[68px] sm:px-1 sm:py-1.5 print:min-h-[58px]`}
    >
      <div className="flex items-center justify-center gap-1">
        <span className="text-[10px] font-bold sm:text-[12px]">{cell.dayNumber}</span>
        {meta ? (
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
        ) : (
          <span className="h-1 w-1 rounded-full bg-muted-foreground" />
        )}
      </div>
      {cell.record ? (
        <div className="mt-0.5 w-full space-y-px text-center font-semibold leading-tight sm:mt-1">
          <p className="truncate text-[7px] sm:text-[9px]">
            <span className="text-muted-foreground">IN</span> {checkIn}
          </p>
          <p className="truncate text-[7px] sm:text-[9px]">
            <span className="text-muted-foreground">OUT</span> {checkOut}
          </p>
        </div>
      ) : null}
    </motion.div>
  );
}

function ListCard({ records }: { records: AttendanceRecord[] }) {
  return (
    <section className="overflow-hidden rounded-[8px] border border-border bg-card shadow-[0_1px_1px_rgba(15,23,42,0.02)]">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-surface-muted text-left text-[11px] font-bold uppercase tracking-wide text-card-foreground">
            <tr>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Check-in</th>
              <th className="px-5 py-3">Check-out</th>
              <th className="px-5 py-3">Hours</th>
              <th className="px-5 py-3">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {records.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-12 text-center text-sm font-medium text-muted-foreground"
                >
                  No attendance records found.
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr key={record.id} className="hover:bg-surface-hover">
                  <td className="px-5 py-4 font-semibold text-card-foreground">
                    {formatShortDate(record.attendanceDate)}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={record.status ?? "ABSENT"} />
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{formatTime(record.checkIn)}</td>
                  <td className="px-5 py-4 text-muted-foreground">{formatTime(record.checkOut)}</td>
                  <td className="px-5 py-4 text-muted-foreground">{formatHours(record)}</td>
                  <td className="px-5 py-4 text-card-foreground">{record.remarks || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${meta.bg} ${meta.text}`}
    >
      {meta.label}
    </span>
  );
}

function IconButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-surface-hover hover:text-card-foreground"
    >
      {children}
    </button>
  );
}

function ToggleButton({
  active,
  label,
  children,
  onClick,
}: {
  active: boolean;
  label: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid h-7 w-7 place-items-center rounded ${active ? "bg-card text-primary shadow" : "text-muted-foreground hover:text-card-foreground"}`}
    >
      {children}
    </button>
  );
}

function LoadingState() {
  return (
    <div className="grid min-h-[26rem] place-items-center rounded-[8px] border border-border bg-card">
      <Loader2 className="animate-spin text-muted-foreground" size={30} />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-[8px] border border-danger/30 bg-danger-soft px-5 py-4 text-sm font-medium text-danger">
      {message}
    </div>
  );
}

function buildCalendarCells(monthDate: Date, records: AttendanceRecord[]): CalendarCell[] {
  const recordByDate = new Map(records.map((record) => [record.attendanceDate, record]));
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const cells: CalendarCell[] = [];
  for (let index = 0; index < first.getDay(); index++)
    cells.push({ date: null, dayNumber: null, record: null, isWeekend: false });
  for (let day = 1; day <= last.getDate(); day++) {
    const date = new Date(year, month, day);
    const key = toDateKey(date);
    cells.push({
      date,
      dayNumber: day,
      record: recordByDate.get(key) ?? null,
      isWeekend: date.getDay() === 0,
    });
  }
  return cells;
}

function filterRecords(records: AttendanceRecord[], search: string, statusFilter: StatusFilter) {
  const needle = search.trim().toLowerCase();
  return records.filter((record) => {
    if (statusFilter && record.status !== statusFilter) return false;
    if (!needle) return true;
    const day = String(parseLocalDate(record.attendanceDate).getDate());
    return (
      day.includes(needle) ||
      formatShortDate(record.attendanceDate).toLowerCase().includes(needle) ||
      STATUS_META[record.status ?? "ABSENT"].label.toLowerCase().includes(needle)
    );
  });
}

function exportPdf(data: EmployeeAttendanceMonthlyResponse, monthDate: Date) {
  const originalTitle = document.title;
  document.title = `${data.employee.employeeCode} ${monthDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })} Attendance`;
  window.print();
  window.setTimeout(() => {
    document.title = originalTitle;
  }, 500);
}
function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseLocalDate(value: string) {
  const [year = 1970, month = 1, day = 1] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatShortDate(value: string | null) {
  if (!value) return "-";
  const date = parseLocalDate(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(value: string | null) {
  return value ? value.slice(0, 5) : "-";
}

function formatHours(record: AttendanceRecord) {
  if (record.hoursLogged !== null && record.hoursLogged !== undefined)
    return String(record.hoursLogged);
  if (record.workingMinutes === null || record.workingMinutes === undefined) return "-";
  return (record.workingMinutes / 60).toFixed(2);
}
