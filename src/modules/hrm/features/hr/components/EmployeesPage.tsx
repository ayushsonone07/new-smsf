import { useEffect, useMemo, useState } from "react";

import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CalendarDays,
  Cake,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useToast } from "@shared/components/feedback";
import {
  AnimatedFilterSelect,
  AnimatedNumber,
  Card,
  EmptyState,
  ErrorDisplay,
  PageHeader,
  StatusBadge,
  TableSkeleton,
  StaggerContainer,
  StaggerItem,
} from "@shared/components/ui";
import { useDebouncedValue } from "@shared/hooks";
import { Select } from "@hrm/components/ui/select";

import { useAppDispatch, useAppSelector } from "@hrm/app/store/hooks";
import {
  fetchEmployees,
  selectEmployees,
  selectEmployeesError,
  selectEmployeesLoading,
  selectEmployeeMutating,
  selectEmployeesPagination,
  updateEmployeeStatus,
} from "@hrm/slices/employeeSlice";
import { getApiErrorMessage } from "@hrm/utils/apiError";

import { CreateEmployeeDialog } from "./CreateEmployeeDialog";
import { OnboardingStatusBadge } from "./OnboardingStatusBadge";
import { useBirthdaysToday } from "@features/birthdays";

import type { EmployeeListItem, EmployeeStatus, OnboardingStatus } from "../types";

const EMPLOYEE_STATUSES: { value: EmployeeStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "on_leave", label: "On leave" },
  { value: "notice", label: "Notice" },
  { value: "terminated", label: "Terminated" },
];
const ONBOARDING_FILTERS: { value: OnboardingStatus; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "LINK_SENT", label: "Link sent" },
  { value: "DETAILS_SUBMITTED", label: "Submitted" },
  { value: "VERIFIED", label: "Verified" },
];

export function EmployeesPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | EmployeeStatus>("");
  const [onboardingStatus, setOnboardingStatus] = useState<"" | OnboardingStatus>("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const toast = useToast();
  const debouncedSearch = useDebouncedValue(search, 350);

  const { data: todayBirthdays = [] } = useBirthdaysToday();

  const items = useAppSelector(selectEmployees);
  const meta = useAppSelector(selectEmployeesPagination);
  const isLoading = useAppSelector(selectEmployeesLoading);
  const error = useAppSelector(selectEmployeesError);
  const total = meta.totalElements ?? 0;
  const pageStats = useMemo(() => summarize(items), [items]);
  const employeeRequest = useMemo(
    () => ({
      q: debouncedSearch || undefined,
      status: status || undefined,
      onboardingStatus: onboardingStatus || undefined,
      page,
      size: pageSize,
      sort: "createdAt,desc",
    }),
    [debouncedSearch, status, onboardingStatus, page, pageSize],
  );

  useEffect(() => {
    void dispatch(fetchEmployees(employeeRequest));
  }, [dispatch, employeeRequest]);

  function resetPage(next: () => void) {
    setPage(0);
    next();
  }

  async function refreshEmployees() {
    if (refreshing || isLoading) return;

    setRefreshing(true);

    try {
      await dispatch(fetchEmployees(employeeRequest)).unwrap();

      toast.success("Employees refreshed", "The latest employee list was loaded.");
    } catch (error) {
      toast.error(
        "Couldn't refresh employees",
        getApiErrorMessage(error, "Unable to refresh employees"),
      );
    } finally {
      setRefreshing(false);
    }
  }

  const isMutating = useAppSelector(selectEmployeeMutating);

  function handleUpdateStatus(employeeId: number, newStatus: EmployeeStatus) {
    void dispatch(updateEmployeeStatus({ id: employeeId, status: newStatus })).then((result) => {
      if (updateEmployeeStatus.fulfilled.match(result)) {
        toast.success("Employee status updated");
      } else {
        toast.error(
          "Couldn't update status",
          result.payload?.message ?? "Update failed",
        );
      }
    });
  }

  return (
    <>
      <StaggerContainer className="space-y-6">
        {todayBirthdays.length > 0 && (
          <StaggerItem>
            <div className="relative overflow-hidden rounded-2xl border border-pink-500/40 bg-gradient-to-r from-pink-500/15 via-purple-500/15 to-amber-500/15 p-5 shadow-lg backdrop-blur-md">
              {/* Floating Balloons, Stars, and Emojis Background Animation */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <span className="absolute bottom-1 left-8 text-2xl anim-balloon-rise" style={{ animationDelay: "0s" }}>🎈</span>
                <span className="absolute bottom-2 left-24 text-xl anim-balloon-rise" style={{ animationDelay: "0.8s" }}>🎈</span>
                <span className="absolute bottom-1 right-16 text-2xl anim-balloon-rise" style={{ animationDelay: "1.5s" }}>🎈</span>
                <span className="absolute bottom-3 right-32 text-xl anim-balloon-rise" style={{ animationDelay: "0.4s" }}>🎈</span>
                
                <span className="absolute top-2 left-16 text-lg anim-star-sparkle" style={{ animationDelay: "0.2s" }}>⭐</span>
                <span className="absolute top-4 right-20 text-base anim-star-sparkle" style={{ animationDelay: "1.1s" }}>✨</span>
                <span className="absolute top-1 right-48 text-lg anim-star-sparkle" style={{ animationDelay: "0.7s" }}>⭐</span>

                <span className="absolute bottom-2 left-44 text-xl anim-float-up" style={{ animationDelay: "0.5s" }}>🎂</span>
                <span className="absolute bottom-1 right-4 text-xl anim-float-up" style={{ animationDelay: "1.2s" }}>🎉</span>
                <span className="absolute bottom-3 left-64 text-lg anim-float-up" style={{ animationDelay: "0.9s" }}>🎁</span>
                <span className="absolute bottom-2 right-60 text-lg anim-float-up" style={{ animationDelay: "0.3s" }}>🥳</span>
              </div>

              <div className="relative z-10 flex items-center gap-4">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-lg animate-bounce">
                  <Cake size={28} />
                </span>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-foreground text-base md:text-lg flex items-center gap-1.5">
                      🎉 Happy Birthday Today! <Sparkles className="text-amber-500 animate-pulse" size={18} />
                    </h3>
                  </div>
                  <p className="text-xs md:text-sm font-medium text-foreground/90">
                    <span className="font-bold text-pink-600 dark:text-pink-400">
                      {todayBirthdays.map((b) => `${b.employeeName} (${b.employeeCode})`).join(", ")}
                    </span>{" "}
                    {todayBirthdays.length === 1 ? "is" : "are"} celebrating their birthday today! Send your warm wishes and make their day special! 🥳🎈
                  </p>


                </div>
              </div>
            </div>
          </StaggerItem>
        )}
        <StaggerItem>
          <PageHeader
            title="Employees"
            actions={
              <>
                <button
                  type="button"
                  onClick={() => setAddEmployeeOpen(true)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary-hover"
                >
                  <Plus size={16} />
                  Employee
                </button>
                <RefreshIconButton
                  refreshing={refreshing || isLoading}
                  onClick={() => void refreshEmployees()}
                />
              </>
            }
          />
        </StaggerItem>

        <StaggerItem variant="card">
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Total employees"
              value={String(total)}
              icon={<Briefcase size={18} />}
              tone="blue"
            />
            <StatTile
              label="Active on page"
              value={String(pageStats.active)}
              icon={<Users size={18} />}
              tone="emerald"
            />
            <StatTile
              label="Onboarding pending"
              value={String(pageStats.pending)}
              icon={<CalendarDays size={18} />}
              tone="amber"
            />
            <StatTile label="Verified on page" value={String(pageStats.verified)} tone="violet" />
          </section>
        </StaggerItem>

        <StaggerItem variant="card">
          <Card padding="none">
            <div className="flex flex-col gap-3 border-b border-border bg-surface-muted/40 p-4 lg:flex-row lg:items-center">
              <label className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={16}
                />
                <input
                  value={search}
                  onChange={(event) => resetPage(() => setSearch(event.target.value))}
                  placeholder="Search name, email, phone, employee code"
                  className="block h-10 w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground shadow placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </label>

              <div className="grid w-full grid-cols-2 gap-3 lg:w-[360px] lg:shrink-0">
                <AnimatedFilterSelect
                  value={status}
                  onValueChange={(nextStatus) =>
                    resetPage(() => setStatus(nextStatus as "" | EmployeeStatus))
                  }
                  options={[{ value: "", label: "Status" }, ...EMPLOYEE_STATUSES]}
                  ariaLabel="Filter employees by status"
                />
                <AnimatedFilterSelect
                  value={onboardingStatus}
                  onValueChange={(nextStatus) =>
                    resetPage(() => setOnboardingStatus(nextStatus as "" | OnboardingStatus))
                  }
                  options={[{ value: "", label: "Onboarding" }, ...ONBOARDING_FILTERS]}
                  ariaLabel="Filter employees by onboarding status"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="p-4">
                <TableSkeleton rows={5} />
              </div>
            ) : error ? (
              <div className="p-4">
                <ErrorDisplay message={error} />
              </div>
            ) : items.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={Briefcase}
                  title="No employees found"
                  description="Click Add employee to create the first employee record."
                />
              </div>
            ) : (
              <EmployeeTable
                employees={items}
                isMutating={isMutating}
                onUpdateStatus={handleUpdateStatus}
                onOpen={(employeeId) => navigate(`/hrm/employees/${employeeId}`)}
              />
            )}

            <PaginationFooter
              page={page}
              pageSize={pageSize}
              total={total}
              totalPages={meta?.totalPages ?? 0}
              hasNext={meta?.hasNext ?? false}
              isLoading={isLoading}
              onPageChange={setPage}
              onPageSizeChange={(size) => { setPageSize(size); setPage(0); }}
            />
          </Card>
        </StaggerItem>
      </StaggerContainer>

      <CreateEmployeeDialog
        open={addEmployeeOpen}
        onClose={() => setAddEmployeeOpen(false)}
        onCreated={(employeeId) => {
          setAddEmployeeOpen(false);
          void navigate(`/hrm/employees/${employeeId}/onboarding`, {
            state: { from: "/hrm/employees", label: "Back to employees" },
          });
        }}
      />
    </>
  );
}

function RefreshIconButton({ refreshing, onClick }: { refreshing: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (!refreshing) {
          onClick();
        }
      }}
      disabled={refreshing}
      aria-label="Refresh employees"
      title="Refresh employees"
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface-elevated text-foreground transition-colors hover:border-border-strong hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
    >
      <RefreshCw size={17} className={refreshing ? "animate-spin" : ""} />
    </button>
  );
}

const STAT_TONES: Record<StatTone, { icon: string; badge: string }> = {
  blue: { icon: "bg-primary-soft text-primary", badge: "bg-primary/10 text-primary" },
  emerald: { icon: "bg-success-soft text-success", badge: "bg-success/10 text-success" },
  amber: { icon: "bg-warning-soft text-warning", badge: "bg-warning/10 text-warning" },
  violet: { icon: "bg-info-soft text-info", badge: "bg-info/10 text-info" },
};

type StatTone = "blue" | "emerald" | "amber" | "violet";

function StatTile({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone: StatTone;
}) {
  const t = STAT_TONES[tone];
  return (
    <Card className="group relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <span className={`absolute right-0 top-0 h-16 w-16 rounded-bl-full opacity-40 blur-2xl ${t.badge}`} />
      <div className="relative flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon ? (
          <span
            className={`grid h-10 w-10 place-items-center rounded-xl shadow transition-transform duration-200 group-hover:scale-110 ${t.icon}`}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-3xl font-extrabold tracking-tight text-foreground">
        <AnimatedNumber value={value} />
      </p>
    </Card>
  );
}

function EmployeeTable({
  employees,
  isMutating,
  onUpdateStatus,
  onOpen,
}: {
  employees: EmployeeListItem[];
  isMutating: boolean;
  onUpdateStatus: (employeeId: number, status: EmployeeStatus) => void;
  onOpen: (employeeId: number) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-surface-muted text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3.5">Employee</th>
            <th className="px-4 py-3.5">Department</th>
            <th className="px-4 py-3.5">Joining</th>
            <th className="px-4 py-3.5">Status</th>
            <th className="px-4 py-3.5">Attendance</th>
            <th className="px-4 py-3.5">Onboarding</th>
            <th className="px-4 py-3.5 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-surface-elevated">
          {employees.map((employee) => (
            <tr key={employee.id} className="transition-colors hover:bg-surface-hover/70">
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <EmployeeAvatar name={employee.name} id={employee.id} />
                  <div className="min-w-0">
                    <div className="font-medium text-foreground">{employee.name}</div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {employee.employeeCode} · {employee.email}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{employee.phone}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3.5 text-foreground">
                <div>{employee.departmentName ?? "Unassigned"}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {employee.designationName ?? employee.employmentType.replace("_", " ")}
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-3.5 text-foreground">
                {formatDate(employee.joiningDate)}
              </td>
              <td className="whitespace-nowrap px-4 py-3.5">
                <Select
                  value={employee.status}
                  disabled={isMutating}
                  onChange={(event) =>
                    onUpdateStatus(employee.id, event.target.value as EmployeeStatus)
                  }
                  aria-label={`Update status for ${employee.name}`}
                  className="h-8 cursor-pointer rounded-lg border border-border bg-surface-elevated px-2 text-xs font-semibold text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {EMPLOYEE_STATUSES.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </td>
              <td className="whitespace-nowrap px-4 py-3.5">
                <AttendancePill present={employee.isPresent === true} />
              </td>
              <td className="whitespace-nowrap px-4 py-3.5">
                <OnboardingStatusBadge status={employee.onboardingStatus} />
              </td>
              <td className="whitespace-nowrap px-4 py-3.5 text-right">
                <button
                  type="button"
                  onClick={() => onOpen(employee.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary-soft px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
                >
                  Open
                  <ArrowRight size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
    <span
      className={`grid h-10 w-10 shrink-0 select-none place-items-center rounded-xl text-sm font-bold ${tone}`}
    >
      {initials}
    </span>
  );
}

function AttendancePill({ present }: { present: boolean }) {
  return (
    <StatusBadge
      label={present ? "Present" : "Absent"}
      tone={present ? "emerald" : "red"}
    />
  );
}

function summarize(items: EmployeeListItem[]) {
  return items.reduce(
    (acc, employee) => {
      if (employee.status === "active") acc.active += 1;
      if (employee.onboardingStatus === "PENDING" || employee.onboardingStatus === "LINK_SENT")
        acc.pending += 1;
      if (employee.onboardingStatus === "VERIFIED") acc.verified += 1;
      return acc;
    },
    { active: 0, pending: 0, verified: 0 },
  );
}

function PaginationFooter({
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
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4 text-muted-foreground">
        <span>
          Showing {start}–{end} of {total.toLocaleString()} employees
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Per page:</span>
          <Select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-lg border border-border bg-surface-elevated px-2 py-1 text-xs font-medium text-foreground"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page === 0 || isLoading}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-elevated px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowLeft size={14} />
          Previous
        </button>
        {getPageNumbers(page, totalPages).map((item, index) =>
          item === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="px-1 text-muted-foreground">
              ...
            </span>
          ) : (
            <button
              key={item}
              type="button"
              disabled={isLoading}
              onClick={() => onPageChange(item)}
              className={`grid h-8 min-w-[32px] place-items-center rounded-lg text-xs font-medium transition-colors ${
                item === page
                  ? "bg-primary text-primary-foreground shadow"
                  : "border border-border bg-surface-elevated text-foreground hover:bg-surface-hover"
              }`}
            >
              {item + 1}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={!hasNext || isLoading}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-elevated px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i);
  }

  const pages: (number | "ellipsis")[] = [0];

  if (current > 3) {
    pages.push("ellipsis");
  }

  const start = Math.max(1, current - 1);
  const end = Math.min(total - 2, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 4) {
    pages.push("ellipsis");
  }

  pages.push(total - 1);

  return pages;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
