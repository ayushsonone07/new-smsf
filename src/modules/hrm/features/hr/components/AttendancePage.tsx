import { useEffect, useState } from "react";

import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, ArrowRight, CalendarDays, Clock, Loader2, LogIn, LogOut, Pencil, RefreshCw, Search, Timer, UserCheck, UserX, Users, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@features/auth";
import { useToast } from "@shared/components/feedback";
import { Card, ErrorDisplay, PageHeader, StaggerContainer, StaggerItem, DatePicker,
  AnimatedFilterSelect } from "@shared/components/ui";
import { useDebouncedValue } from "@shared/hooks";
import { getApiErrorMessage } from "@shared/lib";

import {
  useAttendance,
  useCheckIn,
  useCheckOut,
  useMarkAttendance,
  useMyAttendanceHistory,
  useMyAttendanceToday,
  useUpdateAttendance,
} from "../hooks";


import type { AttendanceInput, AttendanceRecord, AttendanceStatus } from "../types";

const STATUSES: AttendanceStatus[] = ["PRESENT", "ABSENT", "HALF_DAY", "WORK_FROM_HOME", "ON_LEAVE"];
const MINIMUM_CHECKOUT_MINUTES = 4 * 60;

export function AttendancePage() {
  const { role } = useAuth();
  const canViewTeam = role === "ADMIN" || role === "HR" || role === "HR_HEAD"
    || role === "SUB_HR" || role === "MANAGER";
  const [mode, setMode] = useState<"self" | "team">("self");
  const [selectedDate, setSelectedDate] = useState<string>(() => todayInput());
  const queryClient = useQueryClient();
const toast = useToast();
const [isRefreshSubmitting, setIsRefreshSubmitting] = useState(false);
const isRefreshing = useIsFetching({ queryKey: ["hr", "attendance"] }) > 0;

async function refresh() {
  if (isRefreshSubmitting || isRefreshing) return;

  setIsRefreshSubmitting(true);

  try {
    await queryClient.invalidateQueries({
      queryKey: ["hr", "attendance"],
    });

    toast.success("Refresh successfully");
  } catch (error) {
    toast.error(
      "Could not refresh attendance",
      getApiErrorMessage(error),
    );
  } finally {
    setIsRefreshSubmitting(false);
  }
}

  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <PageHeader eyebrow="Time" title="Attendance" description="Check in securely and review attendance records." />
        <div className="flex flex-wrap items-center justify-between gap-3">
          {canViewTeam ? (
            <div className="inline-flex rounded-xl border border-border bg-card p-1 shadow" role="tablist">
              <Tab active={mode === "self"} onClick={() => setMode("self")}>My Attendance</Tab>
              <Tab active={mode === "team"} onClick={() => setMode("team")}>
                {role === "MANAGER" ? "Team Attendance" : role === "SUB_HR" ? "Organisation Attendance" : "Organisation Attendance"}
              </Tab>
            </div>
          ) : <span />}
          <div className="flex items-center gap-3">
            {mode === "team" && canViewTeam ? (
              <DatePicker
                value={selectedDate}
                onChange={setSelectedDate}
                placeholder="Select Date"
                buttonClassName="w-[200px]"
              />
            ) : null}
            <RefreshButton
  onClick={() => void refresh()}
  spinning={isRefreshing || isRefreshSubmitting}
/>
            
          </div>
        </div>
      </StaggerItem>

      <StaggerItem>
        <div
          className={`transition-opacity ${isRefreshing ? "pointer-events-none opacity-60" : ""}`}
          aria-busy={isRefreshing}
        >
        {mode === "team" && canViewTeam ? <TeamAttendance
  date={selectedDate}
/> : <MyAttendance />}
        </div>
      </StaggerItem>
    </StaggerContainer>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick}
    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"}`}>
    {children}
  </button>;
}

function MyAttendance() {
  const today = useMyAttendanceToday();
  const end = todayInput();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  const history = useMyAttendanceHistory(toInput(start), end);
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const toast = useToast();
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setTick(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  if (today.isLoading) return <LoadingPanel />;
  if (today.error) return <ErrorDisplay message={getApiErrorMessage(today.error, "Your attendance could not be loaded.")} />;
  const record = today.data;
  const checkedIn = Boolean(record?.checkIn);
  const checkedOut = Boolean(record?.checkOut);
  const workedMinutes = elapsedMinutes(record, tick);
  const checkoutLocked = checkedIn && !checkedOut && workedMinutes < MINIMUM_CHECKOUT_MINUTES;
  const checkoutRemaining = Math.max(0, MINIMUM_CHECKOUT_MINUTES - workedMinutes);
  const elapsed = checkedIn ? liveDuration(record, tick) : "00:00:00";

  function mutate(action: "in" | "out") {
    const mutation = action === "in" ? checkIn : checkOut;
    mutation.mutate(undefined, {
      onSuccess: () => toast.success(action === "in" ? "Checked in" : "Checked out", "Server time was recorded successfully."),
      onError: (error) => toast.error("Attendance action failed", getApiErrorMessage(error)),
    });
  }

  const records = history.data ?? [];
  const present = records.filter((item) => item.status === "PRESENT" || item.status === "WORK_FROM_HOME").length;
  const late = records.filter((item) => item.late).length;
  const averageMinutes = records.length
    ? Math.round(records.reduce((sum, item) => sum + (item.workingMinutes ?? 0), 0) / records.length) : 0;

  return <div className="space-y-5">
    <section className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary-hover p-6 text-primary-foreground shadow-md">
        <span className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <span className="pointer-events-none absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary-foreground/80">Today · server time</p>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-primary-foreground backdrop-blur">
            {formatStatus(record?.checkInStatus ?? (record?.checkIn ? "ON_TIME_CHECK_IN" : "NOT_CHECKED_IN"))}
          </span>
        </div>
        <p className="relative mt-6 font-mono text-4xl font-extrabold tracking-wide">{elapsed}</p>
        <p className="relative mt-2 text-sm text-primary-foreground/85">
          {record?.checkIn ? `Checked in at ${shortTime(record.checkIn)}` : "You have not checked in today."}
          {record?.late ? " · Late arrival" : ""}
        </p>
        <button type="button" onClick={() => mutate(checkedIn ? "out" : "in")}
          disabled={checkedOut || checkoutLocked || checkIn.isPending || checkOut.isPending}
          className="relative mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-primary shadow transition-all hover:shadow-lg hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50">
          {checkIn.isPending || checkOut.isPending ? <Loader2 size={17} className="animate-spin" />
            : checkedIn ? <LogOut size={17} /> : <LogIn size={17} />}
          {checkedOut
            ? `Checked out at ${shortTime(record?.checkOut)}`
            : checkoutLocked
              ? `Check out available in ${formatMinutes(checkoutRemaining)}`
              : checkedIn ? "Check out" : "Check in"}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Metric label="Present (30d)" value={present} tone="text-success" icon={<Users size={16} />} />
        <Metric label="Late arrivals" value={late} tone="text-warning" icon={<Clock size={16} />} />
        <Metric label="Average hours" value={formatMinutes(averageMinutes)} tone="text-primary" icon={<Timer size={16} />} />
        <Metric label="Records" value={records.length} tone="text-foreground" icon={<CalendarDays size={16} />} />
      </div>
    </section>
    <AttendanceTable records={records} loading={history.isLoading} error={history.error} />
  </div>;
}

function TeamAttendance({
  date,
}: {
  date: string;
}) {
  const mark = useMarkAttendance();
  const update = useUpdateAttendance();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [target, setTarget] = useState<AttendanceRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const toast = useToast();
  const debouncedQuery = useDebouncedValue(query, 350);

  const attendance = useAttendance({
    date: date || todayInput(),
    q: debouncedQuery,
    status,
    page,
    size: pageSize,
  });

  function resetPage(next: () => void) {
    setPage(0);
    next();
  }

  if (attendance.isLoading) return <LoadingPanel />;
  if (attendance.error) return <ErrorDisplay message={getApiErrorMessage(attendance.error, "Scoped attendance could not be loaded.")} />;
  const records = attendance.data?.items ?? [];
  const meta = attendance.data?.meta;
  const total = meta?.totalElements ?? 0;
  const inScope = attendance.data?.inScope ?? 0;
  const checkedIn = attendance.data?.checkedIn ?? 0;
  const working = attendance.data?.workingNow ?? 0;

  function save(input: AttendanceInput) {
    const options = {
      onSuccess: () => { toast.success("Attendance saved"); setTarget(null); },
      onError: (error: Error) => {
        const msg = getApiErrorMessage(error);
        setErrorMessage(msg);
      },
    };
    if (target?.id) update.mutate({ id: target.id, input }, options);
    else mark.mutate(input, options);
  }

  return <div className="space-y-5">
    <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Metric label="In scope" value={inScope} icon={<Users size={16} />} />
      <Metric label="Checked in" value={checkedIn} tone="text-success" icon={<UserCheck size={16} />} />
      <Metric label="Working now" value={working} tone="text-primary" icon={<Clock size={16} />} />
      <Metric label="Not checked in" value={inScope - checkedIn} tone="text-warning" icon={<UserX size={16} />} />
    </section>
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow md:flex-row md:items-center">
      <label className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => resetPage(() => setQuery(event.target.value))}
          placeholder="Search name, employee code or phone number"
          className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/20"
        />
      </label>
      <div className="grid w-full grid-cols-1 md:w-[180px] md:shrink-0">
        <AnimatedFilterSelect
          value={status}
          onValueChange={(nextStatus) => resetPage(() => setStatus(nextStatus))}
          options={[
            { value: "ALL", label: "statuses" },
            { value: "CHECKED_OUT", label: "Checked out" },
            { value: "NOT_CHECKED_IN", label: "Not checked in" },
            { value: "NOT_CHECKED_OUT", label: "Not checked out" },
            { value: "EARLY_CHECK_IN", label: "Early check-in" },
            { value: "EARLY_CHECK_OUT", label: "Early check-out" },
            { value: "ON_TIME_CHECK_IN", label: "On time check-in" },
            { value: "ON_TIME_CHECK_OUT", label: "On time check-out" },
            { value: "LATE_CHECK_IN", label: "Late check-in" },
            { value: "LATE_CHECK_OUT", label: "Late check-out" },
          ]}
          ariaLabel="Filter attendance by status"
        />
      </div>
    </section>
    <div className="max-h-[560px] overflow-auto rounded-2xl border border-border bg-card shadow">
      <table className="min-w-[900px] w-full text-left text-sm">
        <thead className="sticky top-0 z-10 bg-surface-muted text-xs font-bold uppercase tracking-wide text-muted-foreground"><tr>
          <th className="px-4 py-3.5">Employee</th><th className="px-4 py-3.5">Department</th><th className="px-4 py-3.5">Check-in</th><th className="px-4 py-3.5">Check-out</th><th className="px-4 py-3.5">Hours</th><th className="px-4 py-3.5">Check-in Status</th><th className="px-4 py-3.5">Check-out Status</th><th className="px-4 py-3.5 text-right">Actions</th>
        </tr></thead>
        <tbody className="divide-y divide-border">{records.map((record) => <tr key={record.employeeId} className="transition-colors hover:bg-muted/40">
          <td className="px-4 py-3.5">
            <div className="flex items-center gap-3">
              <EmployeeAvatar name={record.employeeName} id={record.employeeId} />
              <div className="min-w-0">
                <p className="truncate font-bold">{record.employeeName}</p>
                <p className="truncate text-xs text-muted-foreground">{record.employeeCode} · {record.phone ?? "—"}</p>
              </div>
            </div>
          </td>
          <td className="px-4 py-3.5">{record.departmentName ?? "—"}</td>
          <td className="px-4 py-3.5 font-mono">{shortTime(record.checkIn)}</td><td className="px-4 py-3.5 font-mono">{shortTime(record.checkOut)}</td><td className="px-4 py-3.5">{formatMinutes(record.workingMinutes ?? 0)}</td>
          <td className="px-4 py-3.5"><CheckInStatusPill status={record.checkInStatus ?? (record.checkIn ? "ON_TIME_CHECK_IN" : "NOT_CHECKED_IN")} /></td><td className="px-4 py-3.5"><CheckOutStatusPill status={record.checkOutStatus ?? (record.checkOut ? "ON_TIME_CHECK_OUT" : "NOT_CHECKED_OUT")} /></td><td className="px-4 py-3.5 text-right"><div className="flex justify-end gap-2">
            <button type="button" onClick={() => void navigate(`/hrm/employees/${record.employeeId}/attendance-history`)} className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold transition-colors hover:bg-muted">History</button>
            <button type="button" onClick={() => setTarget(record)} className="inline-flex items-center gap-1 rounded-lg bg-primary-soft px-3 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/15"><Pencil size={13} /> Correct</button>
          </div></td>
        </tr>)}</tbody>
      </table>
      {records.length === 0 ? <p className="p-10 text-center text-sm text-muted-foreground">No employees match these filters.</p> : null}
    </div>
    <TeamPaginationFooter
      page={page}
      pageSize={pageSize}
      total={total}
      totalPages={meta?.totalPages ?? 0}
      hasNext={meta?.hasNext ?? false}
      isLoading={attendance.isLoading}
      onPageChange={setPage}
      onPageSizeChange={(size) => { setPageSize(size); setPage(0); }}
    />
    {target ? <CorrectionDialog
  record={target}
  date={date || todayInput()}
  pending={mark.isPending || update.isPending}
  onClose={() => setTarget(null)}
  onSave={save}
/> : null}
    {errorMessage ? <ErrorAlertModal title="Attendance Correction Restricted" message={errorMessage} onClose={() => setErrorMessage(null)} /> : null}
  </div>;
}

function ErrorAlertModal({ title = "Action Failed", message, onClose }: { title?: string; message: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl text-card-foreground">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger">
            <AlertCircle size={24} />
          </span>
          <div className="flex-1">
            <h3 className="text-lg font-extrabold">{title}</h3>
            <p className="mt-1 text-sm font-medium leading-relaxed bg-muted/60 p-3.5 rounded-xl border border-border/50 text-foreground">
              {message}
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow hover:bg-primary-hover transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

function TeamPaginationFooter({
  page,
  pageSize,
  total,
  totalPages,
  hasNext,
  isLoading,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const start = total === 0 ? 0 : page * pageSize + 1;
  const end = Math.min(total, (page + 1) * pageSize);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm shadow sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4 text-muted-foreground">
        <span>
          Showing {start}–{end} of {total.toLocaleString()} employees
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Per page:</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="rounded-lg border border-border bg-background px-2 py-1 text-xs font-medium text-foreground"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page === 0 || isLoading}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowLeft size={14} />
          Previous
        </button>
        <span className="px-1 text-xs text-muted-foreground">
          Page {totalPages === 0 ? 1 : page + 1} of {Math.max(totalPages, 1)}
        </span>
        <button
          type="button"
          disabled={!hasNext || isLoading}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

function CorrectionDialog({ record, date, pending, onClose, onSave }: { record: AttendanceRecord; date: string; pending: boolean; onClose: () => void; onSave: (input: AttendanceInput) => void }) {
  const [status, setStatus] = useState<AttendanceStatus>(record.status ?? "PRESENT");
  const [checkIn, setCheckIn] = useState(record.checkIn?.slice(0, 5) ?? "09:30");
  const [checkOut, setCheckOut] = useState(record.checkOut?.slice(0, 5) ?? "");
  const [remarks, setRemarks] = useState(record.remarks ?? "");
  const usesTime = status === "PRESENT" || status === "HALF_DAY" || status === "WORK_FROM_HOME";
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true">
    <form onSubmit={(event) => { event.preventDefault(); onSave({ employeeId: record.employeeId, attendanceDate: date, status, checkIn: usesTime ? checkIn || null : null, checkOut: usesTime ? checkOut || null : null, remarks: remarks.trim() || null }); }} className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl">
      <div className="flex items-start justify-between"><div><h2 className="text-lg font-extrabold">Attendance correction</h2><p className="text-sm text-muted-foreground">{record.employeeName} · {date}</p></div><button type="button" onClick={onClose}><X size={20} /></button></div>
      <div className="mt-5 space-y-4"><label className="block text-sm font-semibold">Status<select value={status} onChange={(event) => setStatus(event.target.value as AttendanceStatus)} className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3">{STATUSES.map((item) => <option key={item} value={item}>{labelStatus(item)}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-3"><label className="text-sm font-semibold">Check-in<input type="time" disabled={!usesTime} value={checkIn} onChange={(event) => setCheckIn(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3" /></label><label className="text-sm font-semibold">Check-out<input type="time" disabled={!usesTime} value={checkOut} onChange={(event) => setCheckOut(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3" /></label></div>
        <label className="block text-sm font-semibold">Remarks<input value={remarks} onChange={(event) => setRemarks(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3" /></label></div>
      <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2.5 font-semibold">Cancel</button><button disabled={pending} className="rounded-xl bg-primary px-4 py-2.5 font-semibold text-primary-foreground disabled:opacity-50">Save correction</button></div>
    </form>
  </div>;
}

function AttendanceTable({ records, loading, error }: { records: AttendanceRecord[]; loading: boolean; error: Error | null }) {
  if (loading) return <LoadingPanel />;
  if (error) return <ErrorDisplay message={getApiErrorMessage(error, "Attendance history could not be loaded.")} />;
  return <Card padding="none"><div className="border-b border-border px-5 py-4"><h2 className="font-extrabold">Recent attendance</h2><p className="text-sm text-muted-foreground">Last 30 days from the authoritative attendance service.</p></div>
    <div className="max-h-[420px] overflow-auto"><table className="min-w-[800px] w-full text-sm"><thead className="sticky top-0 bg-surface-muted text-left text-xs uppercase text-muted-foreground"><tr><th className="px-5 py-3.5">Date</th><th className="px-5 py-3.5">Check-in</th><th className="px-5 py-3.5">Check-out</th><th className="px-5 py-3.5">Hours</th><th className="px-5 py-3.5">Check-in Status</th><th className="px-5 py-3.5">Check-out Status</th></tr></thead><tbody className="divide-y divide-border">{records.map((record) => <tr key={record.id ?? record.attendanceDate} className="transition-colors hover:bg-surface-hover/60"><td className="px-5 py-3.5 font-semibold">{new Date(`${record.attendanceDate}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td><td className="px-5 py-3.5 font-mono">{shortTime(record.checkIn)}</td><td className="px-5 py-3.5 font-mono">{shortTime(record.checkOut)}</td><td className="px-5 py-3.5">{formatMinutes(record.workingMinutes ?? 0)}</td><td className="px-5 py-3.5"><CheckInStatusPill status={record.checkInStatus ?? (record.checkIn ? "ON_TIME_CHECK_IN" : "NOT_CHECKED_IN")} /></td><td className="px-5 py-3.5"><CheckOutStatusPill status={record.checkOutStatus ?? (record.checkOut ? "ON_TIME_CHECK_OUT" : "NOT_CHECKED_OUT")} /></td></tr>)}</tbody></table>{records.length === 0 ? <p className="p-8 text-center text-muted-foreground">No attendance records found for this period.</p> : null}</div></Card>;
}

const METRIC_CHIPS: Record<string, string> = {
  "text-success": "bg-success-soft text-success",
  "text-primary": "bg-primary-soft text-primary",
  "text-warning": "bg-warning-soft text-warning",
  "text-info": "bg-info-soft text-info",
  "text-foreground": "bg-surface-muted text-muted-foreground",
};

function Metric({ label, value, tone = "text-foreground", icon }: { label: string; value: string | number; tone?: string; icon?: React.ReactNode }) {
  return (
    <div className="mbg-card group relative overflow-hidden rounded-2xl border border-border p-5 shadow transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <span className="pointer-events-none absolute -right-5 -top-5 h-16 w-16 rounded-full bg-current opacity-5" />
      <div className="relative flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
        {icon ? (
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-transform duration-200 group-hover:scale-110 ${METRIC_CHIPS[tone] ?? "bg-surface-muted text-muted-foreground"}`}>
            {icon}
          </span>
        ) : null}
      </div>
      <p className={`relative mt-3 text-3xl font-extrabold tracking-tight ${tone}`}>{value}</p>
    </div>
  );
}

function EmployeeAvatar({ name, id }: { name: string; id: number }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
  const palette = [
    "bg-primary-soft text-primary",
    "bg-success-soft text-success",
    "bg-warning-soft text-warning",
    "bg-info-soft text-info",
  ];
  const tone = palette[id % palette.length] ?? palette[0]!;
  return (
    <span className={`grid h-10 w-10 shrink-0 select-none place-items-center rounded-xl text-sm font-bold ${tone}`}>
      {initials}
    </span>
  );
}
function RefreshButton({ onClick, spinning }: { onClick: () => void; spinning: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Refresh attendance"
      title="Refresh attendance"
      className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border bg-card text-foreground shadow transition-colors hover:bg-primary-soft hover:text-primary disabled:cursor-not-allowed disabled:opacity-70"
    >
      <RefreshCw size={16} className={spinning ? "animate-spin" : undefined} />
    </button>
  );
}
function LoadingPanel() { return <div className="grid min-h-48 place-items-center rounded-2xl border border-border bg-card"><Loader2 className="animate-spin text-primary" /></div>; }
function CheckInStatusPill({ status }: { status: string }) {
  const cls = status.includes("LATE") ? "bg-warning-soft text-warning"
    : status === "NOT_CHECKED_IN" ? "bg-danger-soft text-danger"
    : "bg-success-soft text-success";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>{formatStatus(status)}</span>;
}
function CheckOutStatusPill({ status }: { status: string }) {
  const cls = status.includes("LATE") ? "bg-warning-soft text-warning"
    : status === "NOT_CHECKED_OUT" ? "bg-muted text-muted-foreground"
    : status === "NOT_CHECKED_IN" ? "bg-danger-soft text-danger"
    : "bg-success-soft text-success";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>{formatStatus(status)}</span>;
}
function formatStatus(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function labelStatus(status: AttendanceStatus) { return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function shortTime(value?: string | null) { return value ? value.slice(0, 5) : "—"; }
function formatMinutes(minutes: number) { return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`; }
function elapsedMinutes(record: AttendanceRecord | undefined, now: number) {
  if (!record?.checkIn || record.checkOut) return record?.workingMinutes ?? 0;
  const [hours = 0, minutes = 0, seconds = 0] = record.checkIn.split(":").map(Number);
  const startedAt = new Date();
  startedAt.setHours(hours, minutes, seconds, 0);
  return Math.max(0, Math.floor((now - startedAt.getTime()) / 60_000));
}
function todayInput() { return toInput(new Date()); }
function toInput(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function liveDuration(record: AttendanceRecord | undefined, now: number) { if (!record?.checkIn) return "00:00:00"; const [hours = 0, minutes = 0, seconds = 0] = record.checkIn.split(":").map(Number); const start = new Date(); start.setHours(hours, minutes, seconds, 0); const end = record.checkOut ? new Date(start) : new Date(now); if (record.checkOut) { const [outH = 0, outM = 0, outS = 0] = record.checkOut.split(":").map(Number); end.setHours(outH, outM, outS, 0); } const total = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000)); return `${String(Math.floor(total / 3600)).padStart(2, "0")}:${String(Math.floor((total % 3600) / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`; }
