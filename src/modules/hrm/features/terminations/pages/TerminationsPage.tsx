import { useState, type FormEvent, type ReactNode } from "react";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Laptop,
  Loader2,
  Mail,
  Plus,
  RotateCcw,
  Search,
  ShieldOff,
  UserX,
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
  useCreateTermination,
  useRevokeTermination,
  useTerminationPrecheck,
  useTerminations,
  useTerminationSummary,
  useUpdateTerminationClearance,
} from "../hooks";
import type {
  EmployeeTermination,
  TerminationInput,
  TerminationStatus,
  TerminationType,
} from "../types";

const TYPE_OPTIONS: Array<{ value: TerminationType; label: string }> = [
  { value: "CAUSE_MISCONDUCT", label: "Misconduct / Cause" },
  { value: "PERFORMANCE", label: "Performance" },
  { value: "REDUNDANCY", label: "Redundancy / Layoff" },
  { value: "PROBATION_END", label: "Probation End" },
  { value: "ABSCONDING", label: "Absconding" },
  { value: "OTHER", label: "Other" },
];

const STATUS_OPTIONS: Array<{ value: TerminationStatus; label: string; tone: string }> = [
  { value: "COMPLETED", label: "Completed", tone: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300" },
  { value: "SCHEDULED", label: "Scheduled", tone: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  { value: "REVOKED", label: "Revoked", tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
];

function StatusBadge({ status }: { status: TerminationStatus }) {
  const opt = STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0]!;
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${opt.tone}`}>
      {opt.label}
    </span>
  );
}

function typeLabel(type: TerminationType): string {
  return TYPE_OPTIONS.find((t) => t.value === type)?.label ?? type;
}

function ClearancePill({ done, label }: { done: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
        done
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "bg-surface-muted text-muted-foreground"
      }`}
    >
      {label}
    </span>
  );
}

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-surface-elevated px-3 text-sm font-medium text-foreground shadow outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60";

export function TerminationsPage() {
  const { role } = useAuth();
  const canTerminate = role === "ADMIN" || role === "HR" || role === "HR_HEAD";
  const canRevoke = role === "ADMIN" || role === "HR_HEAD";

  const [page, setPage] = useState(1);
  const [terminationType, setTerminationType] = useState<TerminationType | "">("");
  const [status, setStatus] = useState<TerminationStatus | "">("");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<EmployeeTermination | null>(null);
  const [clearanceTarget, setClearanceTarget] = useState<EmployeeTermination | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<EmployeeTermination | null>(null);

  const summary = useTerminationSummary();
  const terminations = useTerminations({
    page,
    size: 10,
    terminationType: terminationType || undefined,
    status: status || undefined,
    search: search.trim() || undefined,
  });

  const list = terminations.data?.data ?? [];
  const meta = terminations.data?.meta;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <RefreshButton
          onRefresh={() => Promise.all([terminations.refetch(), summary.refetch()])}
          isRefreshing={terminations.isFetching || summary.isFetching}
          label="terminations"
          className="h-10 w-10 rounded-xl"
        />
        {canTerminate && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 dark:bg-rose-600 px-3.5 text-xs font-semibold text-white shadow transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Terminate Employee
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Terminations"
          value={summary.data?.totalTerminations ?? 0}
          icon={<UserX className="h-5 w-5 text-rose-600 dark:text-rose-400" />}
        />
        <SummaryCard
          title="Completed"
          value={summary.data?.completedCount ?? 0}
          icon={<ShieldOff className="h-5 w-5 text-slate-700 dark:text-slate-300" />}
        />
        <SummaryCard
          title="Scheduled"
          value={summary.data?.scheduledCount ?? 0}
          icon={<CalendarClock className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
        />
        <SummaryCard
          title="Pending Clearance"
          value={summary.data?.pendingClearanceCount ?? 0}
          icon={<ClipboardCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
        />
      </div>

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search employee or reason..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-border bg-surface-elevated pl-9 pr-3 text-sm text-foreground shadow outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <AnimatedFilterSelect
            value={terminationType}
            onValueChange={(next) => {
              setTerminationType(next as TerminationType | "");
              setPage(1);
            }}
            options={[
              { value: "", label: "All Types" },
              ...TYPE_OPTIONS.map((t) => ({ value: t.value, label: t.label })),
            ]}
            ariaLabel="Filter terminations by type"
          />

          <AnimatedFilterSelect
            value={status}
            onValueChange={(next) => {
              setStatus(next as TerminationStatus | "");
              setPage(1);
            }}
            options={[
              { value: "", label: "All Statuses" },
              ...STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label })),
            ]}
            ariaLabel="Filter terminations by status"
          />
        </div>
      </Card>

      {terminations.isLoading ? (
        <TableSkeleton rows={6} />
      ) : terminations.isError ? (
        <Card className="p-6 text-center text-sm text-danger">
          {getApiErrorMessage(terminations.error, "Failed to load terminations.")}
        </Card>
      ) : list.length === 0 ? (
        <Card className="p-10 text-center">
          <EmptyState
            title="No termination records found"
            description="Employee terminations and exit clearance records will appear here."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Type & Reason</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Exit Clearance</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {list.map((t) => (
                  <tr key={t.id} className="hover:bg-surface-muted/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-foreground">{t.employeeName}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {t.employeeCode} {t.employeeDepartment ? `• ${t.employeeDepartment}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 max-w-[240px]">
                      <div className="text-xs font-semibold text-foreground">{typeLabel(t.terminationType)}</div>
                      <div className="text-xs text-muted-foreground truncate">{t.reason}</div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      <div>Notice: <span className="font-medium text-foreground">{t.terminationDate}</span></div>
                      <div>LWD: <span className="font-medium text-foreground">{t.lastWorkingDay}</span></div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        <ClearancePill done={t.assetCleared} label="Assets" />
                        <ClearancePill done={t.accessRevoked} label="Access" />
                        <ClearancePill done={t.fnfSettled} label="F&F" />
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewing(t)}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-medium text-foreground hover:bg-surface-elevated transition shadow-sm"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                        {canTerminate && t.status !== "REVOKED" && (
                          <button
                            type="button"
                            onClick={() => setClearanceTarget(t)}
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-500/20 transition"
                          >
                            <ClipboardCheck className="h-3.5 w-3.5" />
                            Clearance
                          </button>
                        )}
                        {canRevoke && t.status !== "REVOKED" && (
                          <button
                            type="button"
                            onClick={() => setRevokeTarget(t)}
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 transition"
                            title="Revoke & Reinstate"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Revoke
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
              <span>
                Page {meta.page + 1} of {meta.totalPages} ({meta.totalElements} total records)
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

      {createOpen && (
        <CreateTerminationDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      )}
      {viewing && (
        <TerminationDetailDialog open={Boolean(viewing)} termination={viewing} onClose={() => setViewing(null)} />
      )}
      {clearanceTarget && (
        <ClearanceDialog
          open={Boolean(clearanceTarget)}
          termination={clearanceTarget}
          onClose={() => setClearanceTarget(null)}
        />
      )}
      {revokeTarget && (
        <RevokeDialog
          open={Boolean(revokeTarget)}
          termination={revokeTarget}
          onClose={() => setRevokeTarget(null)}
        />
      )}
    </div>
  );
}

function SummaryCard({ title, value, icon }: { title: string; value: string | number; icon: ReactNode }) {
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

function CreateTerminationDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const createTermination = useCreateTermination();
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState<TerminationInput>({
    employeeId: "",
    terminationType: "CAUSE_MISCONDUCT",
    reason: "",
    detailedNotes: "",
    terminationDate: today,
    lastWorkingDay: today,
    eligibleForRehire: false,
    disableLogin: true,
    sendEmail: true,
  });

  const employeesQuery = useQuery({
    queryKey: ["terminations", "employees", "lookup"],
    queryFn: () => hrService.lookupEmployees(),
  });
  const employees: EmployeeLookupItem[] = employeesQuery.data ?? [];
  const precheckQuery = useTerminationPrecheck(form.employeeId, open);
  const precheck = precheckQuery.data;

  function update<K extends keyof TerminationInput>(key: K, value: TerminationInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.employeeId) {
      toast.error("Please select an employee.");
      return;
    }
    if (precheck?.alreadyTerminated) {
      toast.error("This employee already has an active or scheduled termination.");
      return;
    }
    if (!form.reason.trim()) {
      toast.error("Please enter a termination reason.");
      return;
    }
    try {
      await createTermination.mutateAsync(form);
      toast.success("Employee termination processed successfully.");
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to process termination."));
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Terminate Employee">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto px-1 py-1">
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">
            Employee <span className="text-danger">*</span>
          </label>
          <Select
            value={form.employeeId ? String(form.employeeId) : ""}
            onChange={(e) => update("employeeId", e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Select employee...</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.employeeCode}) {emp.departmentName ? `— ${emp.departmentName}` : ""}
              </option>
            ))}
          </Select>

          {form.employeeId !== "" && precheck && (
            <div className="mt-2 space-y-1.5">
              {precheck.alreadyTerminated && (
                <p className="flex items-center gap-1.5 rounded-md bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
                  <ShieldOff className="h-3.5 w-3.5 shrink-0" />
                  This employee already has an active or scheduled termination.
                </p>
              )}
              {precheck.priorWarningsCount > 0 && (
                <p className="flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {precheck.priorWarningsCount} prior warning{precheck.priorWarningsCount > 1 ? "s" : ""} on record.
                </p>
              )}
              {precheck.assignedAssets.length > 0 && (
                <div className="rounded-md bg-blue-500/10 px-2.5 py-1.5 text-xs text-blue-700 dark:text-blue-300">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Laptop className="h-3.5 w-3.5 shrink-0" />
                    Assigned company assets pending return:
                  </div>
                  <ul className="mt-1 list-disc pl-5 space-y-0.5">
                    {precheck.assignedAssets.map((a) => (
                      <li key={a.id}>
                        {a.assetType}: {a.assetName} ({a.identifier})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Termination Type <span className="text-danger">*</span>
            </label>
            <Select
              value={form.terminationType}
              onChange={(e) => update("terminationType", e.target.value as TerminationType)}
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Short Reason <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={form.reason}
              onChange={(e) => update("reason", e.target.value)}
              placeholder="e.g. Policy violation / PIP failed"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Termination / Notice Date</label>
            <DatePicker
              value={form.terminationDate}
              onChange={(v) => update("terminationDate", v)}
              ariaLabel="Termination date"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Last Working Day</label>
            <DatePicker
              value={form.lastWorkingDay}
              onChange={(v) => update("lastWorkingDay", v)}
              ariaLabel="Last working day"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">Detailed Notes (Optional)</label>
          <textarea
            rows={3}
            value={form.detailedNotes}
            onChange={(e) => update("detailedNotes", e.target.value)}
            placeholder="Incident summary, handover instructions, exit terms..."
            className="w-full rounded-lg border border-border bg-surface-elevated p-2.5 text-sm text-foreground shadow outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="space-y-2 rounded-lg border border-border/70 bg-surface-muted/40 p-3 text-xs">
          <label className="flex items-center gap-2.5 font-medium text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={form.disableLogin}
              onChange={(e) => update("disableLogin", e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <ShieldOff className="h-4 w-4 text-rose-600" />
            Disable portal login immediately (when LWD is today or past)
          </label>
          <label className="flex items-center gap-2.5 font-medium text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={form.sendEmail}
              onChange={(e) => update("sendEmail", e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <Mail className="h-4 w-4 text-primary" />
            Send official termination notice via email
          </label>
          <label className="flex items-center gap-2.5 font-medium text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={form.eligibleForRehire}
              onChange={(e) => update("eligibleForRehire", e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Eligible for future rehire
          </label>
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
            disabled={createTermination.isPending || Boolean(precheck?.alreadyTerminated)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-rose-700 disabled:opacity-50"
          >
            {createTermination.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirm Termination
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function ClearanceDialog({
  open,
  termination,
  onClose,
}: {
  open: boolean;
  termination: EmployeeTermination;
  onClose: () => void;
}) {
  const toast = useToast();
  const updateClearance = useUpdateTerminationClearance();
  const [assetCleared, setAssetCleared] = useState(termination.assetCleared);
  const [accessRevoked, setAccessRevoked] = useState(termination.accessRevoked);
  const [fnfSettled, setFnfSettled] = useState(termination.fnfSettled);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await updateClearance.mutateAsync({
        id: termination.id,
        input: { assetCleared, accessRevoked, fnfSettled },
      });
      toast.success("Exit clearance updated.");
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update clearance."));
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={`Exit Clearance — ${termination.employeeName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2.5 text-sm">
          <label className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-surface-muted/40">
            <input
              type="checkbox"
              checked={assetCleared}
              onChange={(e) => setAssetCleared(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            <div>
              <div className="font-semibold text-foreground">Company Assets Returned</div>
              <div className="text-xs text-muted-foreground">Laptop, SIM card, ID card & visiting cards</div>
            </div>
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-surface-muted/40">
            <input
              type="checkbox"
              checked={accessRevoked}
              onChange={(e) => setAccessRevoked(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            <div>
              <div className="font-semibold text-foreground">Portal & Email Access Revoked</div>
              <div className="text-xs text-muted-foreground">HRM login, official email, and tools disabled</div>
            </div>
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-surface-muted/40">
            <input
              type="checkbox"
              checked={fnfSettled}
              onChange={(e) => setFnfSettled(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            <div>
              <div className="font-semibold text-foreground">Full & Final (F&F) Settled</div>
              <div className="text-xs text-muted-foreground">Final payroll, dues & relieving formalities complete</div>
            </div>
          </label>
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
            disabled={updateClearance.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
          >
            {updateClearance.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save Clearance
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function RevokeDialog({
  open,
  termination,
  onClose,
}: {
  open: boolean;
  termination: EmployeeTermination;
  onClose: () => void;
}) {
  const toast = useToast();
  const revoke = useRevokeTermination();
  const [reason, setReason] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Please enter a reason to revoke termination.");
      return;
    }
    try {
      await revoke.mutateAsync({ id: termination.id, revokedReason: reason.trim() });
      toast.success("Termination revoked and employee reinstated.");
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to revoke termination."));
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={`Revoke Termination — ${termination.employeeName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Revoking will reinstate <strong className="text-foreground">{termination.employeeName}</strong> back to{" "}
          <strong className="text-emerald-600">Active</strong> status and restore portal login access.
        </p>
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">
            Revoke Reason <span className="text-danger">*</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for reinstatement..."
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
            disabled={revoke.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
          >
            {revoke.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirm Reinstate
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function TerminationDetailDialog({
  open,
  termination,
  onClose,
}: {
  open: boolean;
  termination: EmployeeTermination;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={`Termination Record — ${termination.employeeName}`}>
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-muted/50 p-3">
          <div>
            <div className="font-semibold text-foreground">{typeLabel(termination.terminationType)}</div>
            <div className="text-xs text-muted-foreground">
              Notice: {termination.terminationDate} • LWD: {termination.lastWorkingDay}
            </div>
          </div>
          <StatusBadge status={termination.status} />
        </div>

        <div>
          <span className="text-xs font-semibold text-muted-foreground block mb-0.5">Reason</span>
          <p className="font-bold text-foreground">{termination.reason}</p>
        </div>

        {termination.detailedNotes && (
          <div>
            <span className="text-xs font-semibold text-muted-foreground block mb-0.5">Detailed Notes</span>
            <p className="text-foreground/90 whitespace-pre-line rounded-lg border border-border/60 p-3 bg-surface-elevated">
              {termination.detailedNotes}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <ClearancePill done={termination.assetCleared} label={termination.assetCleared ? "Assets Cleared" : "Assets Pending"} />
          <ClearancePill done={termination.accessRevoked} label={termination.accessRevoked ? "Access Revoked" : "Access Active"} />
          <ClearancePill done={termination.fnfSettled} label={termination.fnfSettled ? "F&F Settled" : "F&F Pending"} />
          <ClearancePill done={termination.eligibleForRehire} label={termination.eligibleForRehire ? "Rehire Eligible" : "Not Eligible for Rehire"} />
        </div>

        {termination.status === "REVOKED" && termination.revokedReason && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs">
            <div className="font-semibold text-emerald-700 dark:text-emerald-300">
              Revoked by {termination.revokedByName ?? "Admin"}
            </div>
            <p className="mt-1 text-foreground/90">{termination.revokedReason}</p>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
          <span>Issued by {termination.terminatedByName ?? "HR / Admin"}</span>
          <span>{termination.emailSent ? "Email notice sent" : "No email sent"}</span>
        </div>
      </div>
    </Dialog>
  );
}
