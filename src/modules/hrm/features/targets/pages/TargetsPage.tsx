import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { useQuery } from "@tanstack/react-query";
import {
  Award,
  CalendarDays,
  DollarSign,
  Edit3,
  Loader2,
  Plus,
  Search,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";

import { useAuth } from "@features/auth";
import type { EmployeeLookupItem } from "@features/hr";
import { hrService } from "@features/hr/services";
import { useToast } from "@shared/components/feedback";
import {
  AnimatedFilterSelect,
  Card,
  DatePicker,
  Dialog,
  EmptyState,
  TableSkeleton,
} from "@shared/components/ui";
import { getApiErrorMessage } from "@shared/lib";
import { Select } from "@hrm/components/ui/select";
import { RefreshButton } from "@/components/ui/RefreshButton";

import {
  useCreateSalesTarget,
  useDeleteSalesTarget,
  useMySalesTargets,
  useSalesTargets,
  useSalesTargetSummary,
  useUpdateSalesTarget,
  useUpdateSalesTargetProgress,
} from "../hooks";
import type {
  SalesTarget,
  SalesTargetInput,
  SalesTargetProgressInput,
  TargetStatus,
  TargetType,
} from "../types";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2];

const MONTH_OPTIONS = [
  { value: 1, name: "January" },
  { value: 2, name: "February" },
  { value: 3, name: "March" },
  { value: 4, name: "April" },
  { value: 5, name: "May" },
  { value: 6, name: "June" },
  { value: 7, name: "July" },
  { value: 8, name: "August" },
  { value: 9, name: "September" },
  { value: 10, name: "October" },
  { value: 11, name: "November" },
  { value: 12, name: "December" },
];

const QUARTER_OPTIONS = [
  { value: "Q1", label: "Q1 (Jan 01 – Mar 31)", startM: 1, startD: 1, endM: 3, endD: 31 },
  { value: "Q2", label: "Q2 (Apr 01 – Jun 30)", startM: 4, startD: 1, endM: 6, endD: 30 },
  { value: "Q3", label: "Q3 (Jul 01 – Sep 30)", startM: 7, startD: 1, endM: 9, endD: 30 },
  { value: "Q4", label: "Q4 (Oct 01 – Dec 31)", startM: 10, startD: 1, endM: 12, endD: 31 },
];

function computeCycleData(type: TargetType, year: number, month: number, quarter: string) {
  if (type === "MONTHLY") {
    const monthObj = MONTH_OPTIONS.find((m) => m.value === month) ?? MONTH_OPTIONS[0]!;
    const lastDay = new Date(year, month, 0).getDate();
    const periodStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const periodEnd = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    const cycle = `${monthObj.name} ${year}`;
    return { cycle, periodStart, periodEnd };
  }
  if (type === "YEARLY") {
    const periodStart = `${year}-01-01`;
    const periodEnd = `${year}-12-31`;
    const cycle = `Annual ${year}`;
    return { cycle, periodStart, periodEnd };
  }
  if (type === "QUARTERLY") {
    const qObj = QUARTER_OPTIONS.find((q) => q.value === quarter) ?? QUARTER_OPTIONS[0]!;
    const periodStart = `${year}-${String(qObj.startM).padStart(2, "0")}-01`;
    const periodEnd = `${year}-${String(qObj.endM).padStart(2, "0")}-${String(qObj.endD).padStart(2, "0")}`;
    const cycle = `${quarter} ${year}`;
    return { cycle, periodStart, periodEnd };
  }
  return null;
}

function TargetTypeBadge({ type }: { type?: TargetType | null }) {
  const t = type ?? "MONTHLY";
  const label =
    t === "MONTHLY"
      ? "Monthly"
      : t === "YEARLY"
        ? "Yearly"
        : t === "CUSTOM"
          ? "Custom"
          : "Quarterly";
  const tone =
    t === "MONTHLY"
      ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
      : t === "YEARLY"
        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
        : t === "CUSTOM"
          ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
          : "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20";
  return (
    <span className={`inline-block rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tone}`}>
      {label}
    </span>
  );
}

const STATUS_OPTIONS: Array<{ value: TargetStatus; label: string; tone: string }> = [
  { value: "IN_PROGRESS", label: "In Progress", tone: "border-info bg-info-soft text-info" },
  { value: "ACHIEVED", label: "Achieved", tone: "border-success bg-success-soft text-success" },
  { value: "PENDING", label: "Pending", tone: "border-warning bg-warning-soft text-warning" },
  { value: "MISSED", label: "Missed", tone: "border-danger bg-danger-soft text-danger" },
  { value: "CANCELLED", label: "Cancelled", tone: "border-border bg-surface-muted text-muted-foreground" },
];

function formatCurrency(val: number | null | undefined): string {
  if (val == null) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);
}

function ProgressBar({ percentage }: { percentage: number }) {
  const clamped = Math.min(Math.max(percentage || 0, 0), 100);
  const color =
    clamped >= 100
      ? "bg-emerald-500"
      : clamped >= 70
        ? "bg-blue-500"
        : clamped >= 40
          ? "bg-amber-500"
          : "bg-rose-500";
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs font-semibold mb-1">
        <span className="text-foreground">{percentage.toFixed(1)}%</span>
        <span className="text-muted-foreground">{clamped >= 100 ? "Goal Met!" : `${(100 - clamped).toFixed(0)}% to go`}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-surface-elevated px-3 text-sm font-medium text-foreground shadow outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60";

export function TargetsPage() {
  const { role } = useAuth();
  const canManage = role === "ADMIN" || role === "HR" || role === "HR_HEAD" || role === "MANAGER";
  const isEmployee = role === "EMPLOYEE";
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<TargetStatus | "">("");
  const [targetType, setTargetType] = useState<TargetType | "">("");
  const [cycle, setCycle] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SalesTarget | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<SalesTarget | null>(null);

  const myTargets = useMySalesTargets(isEmployee);
  const summary = useSalesTargetSummary(!isEmployee);
  const targets = useSalesTargets(
    {
      page,
      size: 10,
      status: status || undefined,
      targetType: targetType || undefined,
      cycle: cycle.trim() || undefined,
      employeeSearch: employeeSearch.trim() || undefined,
    },
    !isEmployee,
  );

  const deleteTarget = useDeleteSalesTarget();

  function handleCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function handleEdit(target: SalesTarget) {
    setEditing(target);
    setDialogOpen(true);
  }

  function handleUpdateProgress(target: SalesTarget) {
    setSelectedTarget(target);
    setProgressDialogOpen(true);
  }

  async function handleDelete(target: SalesTarget) {
    if (!window.confirm(`Are you sure you want to delete target for "${target.employeeName}"?`)) return;
    try {
      await deleteTarget.mutateAsync(target.id);
      toast.success("Sales target deleted.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to delete target."));
    }
  }

  if (isEmployee) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <RefreshButton
            onRefresh={() => myTargets.refetch()}
            isRefreshing={myTargets.isFetching}
            label="my sales targets"
            className="h-10 w-10 rounded-xl"
          />
        </div>

        {myTargets.isLoading ? (
          <TableSkeleton rows={4} />
        ) : myTargets.isError ? (
          <Card className="p-6 text-center text-sm text-danger">
            {getApiErrorMessage(myTargets.error, "Failed to load your targets.")}
          </Card>
        ) : !myTargets.data || myTargets.data.length === 0 ? (
          <Card className="p-10 text-center">
            <EmptyState
              title="No sales targets"
              description="When your manager or HR assigns you a sales target, it will appear here."
            />
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {myTargets.data.map((target) => (
              <Card key={target.id} className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TargetTypeBadge type={target.targetType} />
                    <span className="font-semibold text-foreground text-sm">{target.cycle}</span>
                  </div>
                  <StatusBadge status={target.status} />
                </div>

                <div className="grid grid-cols-2 gap-4 py-2 border-y border-border/50 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">Target Amount</span>
                    <span className="font-bold text-foreground text-base">{formatCurrency(target.targetAmount)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Achieved Amount</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">
                      {formatCurrency(target.achievedAmount)}
                    </span>
                  </div>
                </div>

                <ProgressBar percentage={target.achievementPercentage} />

                {target.targetDeals && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <span>Deals Target: {target.achievedDeals ?? 0} / {target.targetDeals}</span>
                    <span>{target.dealsAchievementPercentage?.toFixed(0)}% deals met</span>
                  </div>
                )}

                {target.incentiveAmount && (
                  <div className="rounded-lg bg-amber-500/10 p-2.5 flex items-center justify-between text-xs">
                    <span className="font-medium text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                      <Award className="h-4 w-4" /> Potential Incentive:
                    </span>
                    <span className="font-bold text-amber-800 dark:text-amber-200">
                      {formatCurrency(target.incentiveAmount)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>Period: {target.periodStart} to {target.periodEnd}</span>
                  {target.assignedByName && <span>Assigned by: {target.assignedByName}</span>}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  const list = targets.data?.data ?? [];
  const meta = targets.data?.meta;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <RefreshButton
          onRefresh={() => targets.refetch()}
          isRefreshing={targets.isFetching}
          label="sales targets"
          className="h-10 w-10 rounded-xl"
        />
        {canManage && (
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow transition hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Assign Target
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Target Amount"
          value={formatCurrency(summary.data?.totalTargetAmount)}
          icon={<DollarSign className="h-5 w-5 text-primary" />}
        />
        <SummaryCard
          title="Total Achieved"
          value={formatCurrency(summary.data?.totalAchievedAmount)}
          icon={<TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
        />
        <SummaryCard
          title="Overall Achievement"
          value={`${summary.data?.overallAchievementPercentage?.toFixed(1) ?? 0}%`}
          icon={<Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
        />
        <SummaryCard
          title="Targets Count"
          value={`${summary.data?.achievedTargets ?? 0} / ${summary.data?.totalTargets ?? 0} Achieved`}
          icon={<Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />}
        />
      </div>

      <Card className="p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search sales employee..."
              value={employeeSearch}
              onChange={(e) => {
                setEmployeeSearch(e.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-border bg-surface-elevated pl-9 pr-3 text-sm text-foreground shadow outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <AnimatedFilterSelect
            value={status}
            onValueChange={(next) => {
              setStatus(next as TargetStatus | "");
              setPage(1);
            }}
            options={[
              { value: "", label: "All Statuses" },
              ...STATUS_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label })),
            ]}
            ariaLabel="Filter sales targets by status"
          />

          <AnimatedFilterSelect
            value={targetType}
            onValueChange={(next) => {
              setTargetType(next as TargetType | "");
              setPage(1);
            }}
            options={[
              { value: "", label: "All Frequencies" },
              { value: "MONTHLY", label: "Monthly" },
              { value: "QUARTERLY", label: "Quarterly" },
              { value: "YEARLY", label: "Yearly" },
              { value: "CUSTOM", label: "Custom" },
            ]}
            ariaLabel="Filter sales targets by frequency"
          />

          <input
            type="text"
            placeholder="Filter cycle (e.g. April 2026)..."
            value={cycle}
            onChange={(e) => {
              setCycle(e.target.value);
              setPage(1);
            }}
            className="h-10 w-full rounded-lg border border-border bg-surface-elevated px-3 text-sm text-foreground shadow outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </Card>

      {targets.isLoading ? (
        <TableSkeleton rows={6} />
      ) : targets.isError ? (
        <Card className="p-6 text-center text-sm text-danger">
          {getApiErrorMessage(targets.error, "Failed to load sales targets.")}
        </Card>
      ) : list.length === 0 ? (
        <Card className="p-10 text-center">
          <EmptyState
            title="No sales targets found"
            description="Assign sales goals to your sales reps to start tracking progress."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Frequency & Cycle</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3 min-w-[200px]">Target vs Achieved</th>
                  <th className="px-4 py-3">Deals</th>
                  <th className="px-4 py-3">Incentive</th>
                  <th className="px-4 py-3">Status</th>
                  {canManage && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {list.map((target) => (
                  <tr key={target.id} className="hover:bg-surface-muted/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-foreground">{target.employeeName}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {target.employeeCode} {target.employeeDepartment ? `• ${target.employeeDepartment}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <TargetTypeBadge type={target.targetType} />
                      </div>
                      <span className="font-medium text-foreground text-xs">{target.cycle}</span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      <div>{target.periodStart}</div>
                      <div>to {target.periodEnd}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-between text-xs font-semibold mb-1">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          {formatCurrency(target.achievedAmount)}
                        </span>
                        <span className="text-muted-foreground">
                          of {formatCurrency(target.targetAmount)}
                        </span>
                      </div>
                      <ProgressBar percentage={target.achievementPercentage} />
                    </td>
                    <td className="px-4 py-3.5 text-xs">
                      {target.targetDeals ? (
                        <div>
                          <span className="font-semibold text-foreground">{target.achievedDeals ?? 0}</span>
                          <span className="text-muted-foreground"> / {target.targetDeals} deals</span>
                          <div className="text-[10px] text-muted-foreground">
                            ({target.dealsAchievementPercentage?.toFixed(0)}%)
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-foreground">
                      {target.incentiveAmount ? formatCurrency(target.incentiveAmount) : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={target.status} />
                    </td>
                    {canManage && (
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateProgress(target)}
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-xs font-medium text-foreground hover:bg-surface-elevated hover:text-primary transition shadow-sm"
                            title="Update Achieved Progress"
                          >
                            <TrendingUp className="h-3.5 w-3.5 text-primary" />
                            Progress
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEdit(target)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-foreground hover:bg-surface-elevated transition shadow-sm"
                            title="Edit Target"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(target)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-danger hover:bg-danger/10 transition shadow-sm"
                            title="Delete Target"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
              <span>
                Page {meta.page + 1} of {meta.totalPages} ({meta.totalElements} total targets)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-md border border-border px-2.5 py-1 font-medium disabled:opacity-50 hover:bg-surface-elevated"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-md border border-border px-2.5 py-1 font-medium disabled:opacity-50 hover:bg-surface-elevated"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {dialogOpen && (
        <TargetDialog
          open={dialogOpen}
          target={editing}
          onClose={() => setDialogOpen(false)}
        />
      )}

      {progressDialogOpen && selectedTarget && (
        <ProgressDialog
          open={progressDialogOpen}
          target={selectedTarget}
          onClose={() => setProgressDialogOpen(false)}
        />
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: ReactNode;
}) {
  return (
    <Card className="p-4 flex items-center justify-between shadow-sm">
      <div className="space-y-1">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <div className="text-xl font-bold text-foreground">{value}</div>
      </div>
      <div className="rounded-xl bg-surface-muted p-2.5">{icon}</div>
    </Card>
  );
}

function StatusBadge({ status }: { status: TargetStatus }) {
  const opt = STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0]!;
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${opt.tone}`}
    >
      {opt.label}
    </span>
  );
}

function TargetDialog({
  open,
  target,
  onClose,
}: {
  open: boolean;
  target: SalesTarget | null;
  onClose: () => void;
}) {
  const isEditing = Boolean(target);
  const toast = useToast();
  const createTarget = useCreateSalesTarget();
  const updateTarget = useUpdateSalesTarget();

  const [form, setForm] = useState<SalesTargetInput>(() =>
    target ? toInput(target) : emptyInput(),
  );

  const [calYear, setCalYear] = useState<number>(CURRENT_YEAR);
  const [calMonth, setCalMonth] = useState<number>(new Date().getMonth() + 1);
  const [calQuarter, setCalQuarter] = useState<string>("Q1");

  const employeesQuery = useQuery({
    queryKey: ["targets", "employees", "lookup"],
    queryFn: () => hrService.lookupEmployees(),
  });

  const employees: EmployeeLookupItem[] = employeesQuery.data ?? [];

  useEffect(() => {
    if (!open) return;
    if (target) {
      setForm(toInput(target));
      if (target.periodStart) {
        const d = new Date(target.periodStart);
        if (!isNaN(d.getTime())) {
          setCalYear(d.getFullYear());
          setCalMonth(d.getMonth() + 1);
        }
      }
    } else {
      setForm(emptyInput());
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      setCalYear(currentYear);
      setCalMonth(currentMonth);
      const computed = computeCycleData("MONTHLY", currentYear, currentMonth, "Q1");
      if (computed) {
        setForm((prev) => ({
          ...prev,
          cycle: computed.cycle,
          periodStart: computed.periodStart,
          periodEnd: computed.periodEnd,
        }));
      }
    }
  }, [open, target]);

  function handleFrequencyChange(newType: TargetType) {
    setForm((prev) => {
      const next = { ...prev, targetType: newType };
      const computed = computeCycleData(newType, calYear, calMonth, calQuarter);
      if (computed) {
        next.cycle = computed.cycle;
        next.periodStart = computed.periodStart;
        next.periodEnd = computed.periodEnd;
      }
      return next;
    });
  }

  function handleDateParamChange(
    param: "year" | "month" | "quarter",
    val: number | string,
  ) {
    let nextY = calYear;
    let nextM = calMonth;
    let nextQ = calQuarter;
    if (param === "year") {
      nextY = Number(val);
      setCalYear(nextY);
    } else if (param === "month") {
      nextM = Number(val);
      setCalMonth(nextM);
    } else if (param === "quarter") {
      nextQ = String(val);
      setCalQuarter(nextQ);
    }
    const computed = computeCycleData(form.targetType, nextY, nextM, nextQ);
    if (computed) {
      setForm((prev) => ({
        ...prev,
        cycle: computed.cycle,
        periodStart: computed.periodStart,
        periodEnd: computed.periodEnd,
      }));
    }
  }

  function update<K extends keyof SalesTargetInput>(key: K, value: SalesTargetInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.employeeId) {
      toast.error("Please select a sales employee.");
      return;
    }
    if (!form.cycle.trim()) {
      toast.error("Please provide a cycle name.");
      return;
    }
    if (!form.periodStart || !form.periodEnd) {
      toast.error("Period start and end dates are required.");
      return;
    }
    if (form.targetAmount === "" || Number(form.targetAmount) < 0) {
      toast.error("Please enter a valid target amount (>= 0).");
      return;
    }

    try {
      const payload: SalesTargetInput = {
        ...form,
        targetAmount: Number(form.targetAmount),
        achievedAmount: form.achievedAmount !== "" ? Number(form.achievedAmount) : 0,
        targetDeals: form.targetDeals !== "" ? Number(form.targetDeals) : undefined,
        achievedDeals: form.achievedDeals !== "" ? Number(form.achievedDeals) : 0,
        incentiveAmount: form.incentiveAmount !== "" ? Number(form.incentiveAmount) : undefined,
      };

      if (isEditing && target) {
        await updateTarget.mutateAsync({ id: target.id, input: payload });
        toast.success("Sales target updated successfully.");
      } else {
        await createTarget.mutateAsync(payload);
        toast.success("Sales target created successfully.");
      }
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save sales target."));
    }
  }

  const isSaving = createTarget.isPending || updateTarget.isPending;

  return (
    <Dialog open={open} onClose={onClose} title={isEditing ? "Edit Sales Target" : "Assign Sales Target"}>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto px-1 py-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Sales Employee <span className="text-danger">*</span>
            </label>
            <Select
              value={form.employeeId ? String(form.employeeId) : ""}
              onChange={(e) => update("employeeId", e.target.value ? Number(e.target.value) : "")}
              disabled={isEditing}
            >
              <option value="">Select sales employee...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employeeCode}) {emp.departmentName ? `— ${emp.departmentName}` : ""}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Assigned By (Manager / Admin)
            </label>
            <Select
              value={form.assignedById ? String(form.assignedById) : ""}
              onChange={(e) => update("assignedById", e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Logged-in User (Admin)</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employeeCode})
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-surface-muted/40 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-primary" /> Target Cycle & Frequency
            </span>
            <TargetTypeBadge type={form.targetType} />
          </div>

          <div className="grid grid-cols-4 gap-1.5 bg-surface-elevated p-1 rounded-lg border border-border">
            {(["MONTHLY", "QUARTERLY", "YEARLY", "CUSTOM"] as TargetType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleFrequencyChange(type)}
                className={`py-1.5 text-xs font-semibold rounded-md transition ${
                  form.targetType === type
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {type.charAt(0) + type.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {form.targetType === "MONTHLY" && (
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Month</label>
                <Select
                  value={String(calMonth)}
                  onChange={(e) => handleDateParamChange("month", Number(e.target.value))}
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Year</label>
                <Select
                  value={String(calYear)}
                  onChange={(e) => handleDateParamChange("year", Number(e.target.value))}
                >
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          )}

          {form.targetType === "QUARTERLY" && (
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Quarter</label>
                <Select
                  value={calQuarter}
                  onChange={(e) => handleDateParamChange("quarter", e.target.value)}
                >
                  {QUARTER_OPTIONS.map((q) => (
                    <option key={q.value} value={q.value}>
                      {q.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Year</label>
                <Select
                  value={String(calYear)}
                  onChange={(e) => handleDateParamChange("year", Number(e.target.value))}
                >
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          )}

          {form.targetType === "YEARLY" && (
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Year</label>
              <Select
                value={String(calYear)}
                onChange={(e) => handleDateParamChange("year", Number(e.target.value))}
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    Annual {y}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Cycle Name</label>
            <input
              type="text"
              value={form.cycle}
              onChange={(e) => update("cycle", e.target.value)}
              placeholder="e.g. April 2026, Q1 2026..."
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Period Start</label>
              <DatePicker
                value={form.periodStart}
                onChange={(v) => update("periodStart", v)}
                ariaLabel="Period start date"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Period End</label>
              <DatePicker
                value={form.periodEnd}
                onChange={(v) => update("periodEnd", v)}
                ariaLabel="Period end date"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Target Sales Amount (₹) <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              value={form.targetAmount}
              onChange={(e) => update("targetAmount", e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="e.g. 500000"
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Achieved Amount (₹)
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              value={form.achievedAmount ?? ""}
              onChange={(e) => update("achievedAmount", e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="e.g. 0"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Target Deals Count (Optional)
            </label>
            <input
              type="number"
              min="0"
              value={form.targetDeals ?? ""}
              onChange={(e) => update("targetDeals", e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="e.g. 20"
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Achieved Deals Count
            </label>
            <input
              type="number"
              min="0"
              value={form.achievedDeals ?? ""}
              onChange={(e) => update("achievedDeals", e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="e.g. 0"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Potential Incentive (₹)
            </label>
            <input
              type="number"
              min="0"
              value={form.incentiveAmount ?? ""}
              onChange={(e) => update("incentiveAmount", e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="e.g. 15000"
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Status</label>
            <Select
              value={form.status}
              onChange={(e) => update("status", e.target.value as TargetStatus)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">Remarks / Notes</label>
          <textarea
            rows={2}
            value={form.remarks}
            onChange={(e) => update("remarks", e.target.value)}
            placeholder="Special terms, client list, product focus..."
            className="w-full rounded-lg border border-border bg-surface-elevated p-2.5 text-sm text-foreground shadow outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface-elevated"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
          >
            {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEditing ? "Update Target" : "Assign Target"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function ProgressDialog({
  open,
  target,
  onClose,
}: {
  open: boolean;
  target: SalesTarget;
  onClose: () => void;
}) {
  const toast = useToast();
  const updateProgress = useUpdateSalesTargetProgress();

  const [achievedAmount, setAchievedAmount] = useState<number | "">(target.achievedAmount ?? 0);
  const [achievedDeals, setAchievedDeals] = useState<number | "">(target.achievedDeals ?? 0);
  const [status, setStatus] = useState<TargetStatus>(target.status);
  const [remarks, setRemarks] = useState<string>(target.remarks ?? "");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const payload: SalesTargetProgressInput = {
        achievedAmount: achievedAmount !== "" ? Number(achievedAmount) : 0,
        achievedDeals: achievedDeals !== "" ? Number(achievedDeals) : 0,
        status,
        remarks,
      };
      await updateProgress.mutateAsync({ id: target.id, input: payload });
      toast.success("Target progress updated successfully.");
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update progress."));
    }
  }

  const isSaving = updateProgress.isPending;

  return (
    <Dialog open={open} onClose={onClose} title={`Update Progress — ${target.employeeName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg bg-surface-muted p-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cycle:</span>
            <span className="font-semibold text-foreground">{target.cycle} ({target.targetType})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Target Amount:</span>
            <span className="font-bold text-foreground">{formatCurrency(target.targetAmount)}</span>
          </div>
          {target.targetDeals && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Target Deals:</span>
              <span className="font-semibold text-foreground">{target.targetDeals} deals</span>
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">
            Achieved Amount (₹) <span className="text-danger">*</span>
          </label>
          <input
            type="number"
            min="0"
            step="1000"
            value={achievedAmount}
            onChange={(e) => setAchievedAmount(e.target.value === "" ? "" : Number(e.target.value))}
            className={inputClass}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">
            Achieved Deals Count
          </label>
          <input
            type="number"
            min="0"
            value={achievedDeals}
            onChange={(e) => setAchievedDeals(e.target.value === "" ? "" : Number(e.target.value))}
            className={inputClass}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">Status</label>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as TargetStatus)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">Remarks</label>
          <textarea
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-elevated p-2.5 text-sm text-foreground shadow outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface-elevated"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
          >
            {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save Progress
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function emptyInput(): SalesTargetInput {
  return {
    employeeId: "",
    targetType: "MONTHLY",
    cycle: "",
    periodStart: "",
    periodEnd: "",
    targetAmount: "",
    achievedAmount: 0,
    targetDeals: "",
    achievedDeals: 0,
    incentiveAmount: "",
    status: "IN_PROGRESS",
    remarks: "",
  };
}

function toInput(target: SalesTarget): SalesTargetInput {
  return {
    employeeId: target.employeeId,
    assignedById: target.assignedById ?? undefined,
    targetType: target.targetType,
    cycle: target.cycle,
    periodStart: target.periodStart,
    periodEnd: target.periodEnd,
    targetAmount: target.targetAmount,
    achievedAmount: target.achievedAmount,
    targetDeals: target.targetDeals ?? "",
    achievedDeals: target.achievedDeals ?? 0,
    incentiveAmount: target.incentiveAmount ?? "",
    status: target.status,
    remarks: target.remarks ?? "",
  };
}
