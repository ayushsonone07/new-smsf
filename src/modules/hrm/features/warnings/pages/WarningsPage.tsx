import { useState, type FormEvent, type ReactNode } from "react";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  Mail,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
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
  useAcknowledgeWarning,
  useCreateWarning,
  useDeleteWarning,
  useEmployeeWarningCount,
  useMyWarnings,
  useUpdateWarningStatus,
  useWarnings,
  useWarningSummary,
} from "../hooks";
import type {
  EmployeeWarning,
  WarningCategory,
  WarningInput,
  WarningSeverity,
  WarningStatus,
} from "../types";

const SEVERITY_OPTIONS: Array<{ value: WarningSeverity; label: string; tone: string }> = [
  { value: "VERBAL", label: "Verbal", tone: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  { value: "FIRST_WRITTEN", label: "1st Written", tone: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  { value: "SECOND_WRITTEN", label: "2nd Written", tone: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300" },
  { value: "FINAL", label: "Final Warning", tone: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300" },
];

const CATEGORY_OPTIONS: Array<{ value: WarningCategory; label: string }> = [
  { value: "ATTENDANCE", label: "Attendance / Late" },
  { value: "PERFORMANCE", label: "Performance" },
  { value: "MISCONDUCT", label: "Misconduct" },
  { value: "POLICY_VIOLATION", label: "Policy Violation" },
  { value: "OTHER", label: "Other" },
];

const STATUS_OPTIONS: Array<{ value: WarningStatus; label: string; tone: string }> = [
  { value: "ISSUED", label: "Issued", tone: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  { value: "ACKNOWLEDGED", label: "Acknowledged", tone: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  { value: "RESOLVED", label: "Resolved", tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
];

function SeverityBadge({ severity }: { severity: WarningSeverity }) {
  const opt = SEVERITY_OPTIONS.find((s) => s.value === severity) ?? SEVERITY_OPTIONS[1]!;
  return (
    <span className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${opt.tone}`}>
      {opt.label}
    </span>
  );
}

function StatusBadge({ status }: { status: WarningStatus }) {
  const opt = STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0]!;
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${opt.tone}`}>
      {opt.label}
    </span>
  );
}

function categoryLabel(category: WarningCategory): string {
  return CATEGORY_OPTIONS.find((c) => c.value === category)?.label ?? category;
}

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-surface-elevated px-3 text-sm font-medium text-foreground shadow outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60";

export function WarningsPage() {
  const { role } = useAuth();
  const canIssue = role === "ADMIN" || role === "HR" || role === "HR_HEAD" || role === "MANAGER";
  const canDelete = role === "ADMIN" || role === "HR" || role === "HR_HEAD";
  const isEmployee = role === "EMPLOYEE";
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [severity, setSeverity] = useState<WarningSeverity | "">("");
  const [category, setCategory] = useState<WarningCategory | "">("");
  const [status, setStatus] = useState<WarningStatus | "">("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [issueOpen, setIssueOpen] = useState(false);
  const [viewing, setViewing] = useState<EmployeeWarning | null>(null);
  const [acknowledging, setAcknowledging] = useState<EmployeeWarning | null>(null);

  const myWarnings = useMyWarnings(isEmployee);
  const summary = useWarningSummary(!isEmployee);
  const warnings = useWarnings(
    {
      page,
      size: 10,
      severity: severity || undefined,
      category: category || undefined,
      status: status || undefined,
      employeeSearch: employeeSearch.trim() || undefined,
    },
    !isEmployee,
  );

  const deleteWarning = useDeleteWarning();
  const updateStatus = useUpdateWarningStatus();

  async function handleDelete(warning: EmployeeWarning) {
    if (!window.confirm(`Delete warning "${warning.subject}" for ${warning.employeeName}?`)) return;
    try {
      await deleteWarning.mutateAsync(warning.id);
      toast.success("Warning deleted.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to delete warning."));
    }
  }

  async function handleResolve(warning: EmployeeWarning) {
    try {
      await updateStatus.mutateAsync({ id: warning.id, status: "RESOLVED" });
      toast.success("Warning marked as resolved.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update warning status."));
    }
  }

  if (isEmployee) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <RefreshButton
            onRefresh={() => myWarnings.refetch()}
            isRefreshing={myWarnings.isFetching}
            label="my warnings"
            className="h-10 w-10 rounded-xl"
          />
        </div>

        {myWarnings.isLoading ? (
          <TableSkeleton rows={4} />
        ) : myWarnings.isError ? (
          <Card className="p-6 text-center text-sm text-danger">
            {getApiErrorMessage(myWarnings.error, "Failed to load your warnings.")}
          </Card>
        ) : !myWarnings.data || myWarnings.data.length === 0 ? (
          <Card className="p-10 text-center">
            <EmptyState
              title="No warnings"
              description="You have a clean record with no disciplinary warnings."
            />
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {myWarnings.data.map((w) => (
              <Card key={w.id} className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={w.severity} />
                      <span className="text-xs font-medium text-muted-foreground">
                        {categoryLabel(w.category)}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-foreground">{w.subject}</h3>
                  </div>
                  <StatusBadge status={w.status} />
                </div>

                <p className="text-sm text-foreground/90 whitespace-pre-line">{w.description}</p>

                {w.actionRequired && (
                  <div className="rounded-lg border border-border/60 bg-surface-muted/40 p-3 text-xs">
                    <span className="font-semibold text-foreground block mb-0.5">Action Required:</span>
                    <span className="text-muted-foreground whitespace-pre-line">{w.actionRequired}</span>
                  </div>
                )}

                {w.employeeResponse && (
                  <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs">
                    <span className="font-semibold text-blue-700 dark:text-blue-300 block mb-0.5">
                      Your Response:
                    </span>
                    <span className="text-foreground/90 whitespace-pre-line">{w.employeeResponse}</span>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  <span>
                    Issued: {w.issuedDate} {w.issuedByName ? `• By ${w.issuedByName}` : ""}
                  </span>
                  {w.status === "ISSUED" && (
                    <button
                      type="button"
                      onClick={() => setAcknowledging(w)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Acknowledge
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {acknowledging && (
          <AcknowledgeDialog
            open={Boolean(acknowledging)}
            warning={acknowledging}
            onClose={() => setAcknowledging(null)}
          />
        )}
      </div>
    );
  }

  const list = warnings.data?.data ?? [];
  const meta = warnings.data?.meta;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <RefreshButton
          onRefresh={() => Promise.all([warnings.refetch(), summary.refetch()])}
          isRefreshing={warnings.isFetching || summary.isFetching}
          label="warnings"
          className="h-10 w-10 rounded-xl"
        />
        {canIssue && (
          <button
            type="button"
            onClick={() => setIssueOpen(true)}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-rose-600 px-3.5 text-xs font-semibold text-white shadow transition hover:bg-rose-700"
          >
            <Plus className="h-4 w-4" />
            Issue Warning
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Warnings"
          value={summary.data?.totalWarnings ?? 0}
          icon={<AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
        />
        <SummaryCard
          title="Pending Acknowledgement"
          value={summary.data?.issuedCount ?? 0}
          icon={<Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
        />
        <SummaryCard
          title="Final Warnings"
          value={summary.data?.finalWarningsCount ?? 0}
          icon={<ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-400" />}
        />
        <SummaryCard
          title="Resolved"
          value={summary.data?.resolvedCount ?? 0}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
        />
      </div>

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search employee or subject..."
              value={employeeSearch}
              onChange={(e) => {
                setEmployeeSearch(e.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-border bg-surface-elevated pl-9 pr-3 text-sm text-foreground shadow outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <AnimatedFilterSelect
            value={severity}
            onValueChange={(next) => {
              setSeverity(next as WarningSeverity | "");
              setPage(1);
            }}
            options={[
              { value: "", label: "All Severities" },
              ...SEVERITY_OPTIONS.map((s) => ({ value: s.value, label: s.label })),
            ]}
            ariaLabel="Filter warnings by severity"
          />

          <AnimatedFilterSelect
            value={category}
            onValueChange={(next) => {
              setCategory(next as WarningCategory | "");
              setPage(1);
            }}
            options={[
              { value: "", label: "All Categories" },
              ...CATEGORY_OPTIONS.map((c) => ({ value: c.value, label: c.label })),
            ]}
            ariaLabel="Filter warnings by category"
          />

          <AnimatedFilterSelect
            value={status}
            onValueChange={(next) => {
              setStatus(next as WarningStatus | "");
              setPage(1);
            }}
            options={[
              { value: "", label: "All Statuses" },
              ...STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label })),
            ]}
            ariaLabel="Filter warnings by status"
          />
        </div>
      </Card>

      {warnings.isLoading ? (
        <TableSkeleton rows={6} />
      ) : warnings.isError ? (
        <Card className="p-6 text-center text-sm text-danger">
          {getApiErrorMessage(warnings.error, "Failed to load warnings.")}
        </Card>
      ) : list.length === 0 ? (
        <Card className="p-10 text-center">
          <EmptyState
            title="No warnings found"
            description="Issued disciplinary notices and acknowledgements will appear here."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Severity & Category</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Issued</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {list.map((w) => (
                  <tr key={w.id} className="hover:bg-surface-muted/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-foreground">{w.employeeName}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {w.employeeCode} {w.employeeDepartment ? `• ${w.employeeDepartment}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="mb-1">
                        <SeverityBadge severity={w.severity} />
                      </div>
                      <span className="text-xs text-muted-foreground">{categoryLabel(w.category)}</span>
                    </td>
                    <td className="px-4 py-3.5 max-w-[260px]">
                      <div className="font-medium text-foreground truncate">{w.subject}</div>
                      {w.emailSent && (
                        <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Mail className="h-3 w-3 text-emerald-600" /> Email sent
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      <div className="font-medium text-foreground">{w.issuedDate}</div>
                      <div>By {w.issuedByName ?? "HR"}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={w.status} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewing(w)}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-medium text-foreground hover:bg-surface-elevated transition shadow-sm"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                        {canIssue && w.status !== "RESOLVED" && (
                          <button
                            type="button"
                            onClick={() => handleResolve(w)}
                            disabled={updateStatus.isPending}
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Resolve
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(w)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-danger hover:bg-danger/10 transition shadow-sm"
                            title="Delete Warning"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
                Page {meta.page + 1} of {meta.totalPages} ({meta.totalElements} total warnings)
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

      {issueOpen && (
        <IssueWarningDialog
          open={issueOpen}
          onClose={() => setIssueOpen(false)}
        />
      )}

      {viewing && (
        <WarningDetailDialog
          open={Boolean(viewing)}
          warning={viewing}
          onClose={() => setViewing(null)}
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

function IssueWarningDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const createWarning = useCreateWarning();
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState<WarningInput>({
    employeeId: "",
    severity: "FIRST_WRITTEN",
    category: "ATTENDANCE",
    subject: "",
    description: "",
    actionRequired: "",
    issuedDate: today,
    sendEmail: true,
  });

  const employeesQuery = useQuery({
    queryKey: ["warnings", "employees", "lookup"],
    queryFn: () => hrService.lookupEmployees(),
  });
  const employees: EmployeeLookupItem[] = employeesQuery.data ?? [];
  const priorCountQuery = useEmployeeWarningCount(form.employeeId, open);
  const priorCount = priorCountQuery.data ?? 0;

  function update<K extends keyof WarningInput>(key: K, value: WarningInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.employeeId) {
      toast.error("Please select an employee.");
      return;
    }
    if (!form.subject.trim()) {
      toast.error("Please enter a warning subject.");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Please enter warning details.");
      return;
    }

    try {
      await createWarning.mutateAsync(form);
      toast.success(form.sendEmail ? "Warning issued and email sent." : "Warning issued successfully.");
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to issue warning."));
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Issue Employee Warning">
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
          {form.employeeId !== "" && priorCount > 0 && (
            <p className="mt-1.5 flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              This employee already has {priorCount} prior warning{priorCount > 1 ? "s" : ""} on record.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Severity Level <span className="text-danger">*</span>
            </label>
            <Select
              value={form.severity}
              onChange={(e) => update("severity", e.target.value as WarningSeverity)}
            >
              {SEVERITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Category <span className="text-danger">*</span>
            </label>
            <Select
              value={form.category}
              onChange={(e) => update("category", e.target.value as WarningCategory)}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Subject <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => update("subject", e.target.value)}
              placeholder="e.g. Repeated Late Check-in"
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Issued Date
            </label>
            <DatePicker
              value={form.issuedDate}
              onChange={(v) => update("issuedDate", v)}
              ariaLabel="Warning issued date"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">
            Detailed Reason <span className="text-danger">*</span>
          </label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Describe the incident, dates, and policy reference..."
            className="w-full rounded-lg border border-border bg-surface-elevated p-2.5 text-sm text-foreground shadow outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">
            Expected Action / Improvement Plan (Optional)
          </label>
          <textarea
            rows={2}
            value={form.actionRequired}
            onChange={(e) => update("actionRequired", e.target.value)}
            placeholder="Expected corrective steps or timeline..."
            className="w-full rounded-lg border border-border bg-surface-elevated p-2.5 text-sm text-foreground shadow outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <label className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-surface-muted/40 px-3 py-2.5 text-xs font-medium text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={form.sendEmail}
            onChange={(e) => update("sendEmail", e.target.checked)}
            className="h-4 w-4 rounded border-border accent-primary"
          />
          <Mail className="h-4 w-4 text-primary" />
          Send official warning notice via email to employee
        </label>

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
            disabled={createWarning.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-rose-700 disabled:opacity-50"
          >
            {createWarning.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Issue Warning
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function WarningDetailDialog({
  open,
  warning,
  onClose,
}: {
  open: boolean;
  warning: EmployeeWarning;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={`Warning Details — ${warning.employeeName}`}>
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-muted/50 p-3">
          <div className="flex items-center gap-2">
            <SeverityBadge severity={warning.severity} />
            <span className="text-xs font-medium text-muted-foreground">
              {categoryLabel(warning.category)}
            </span>
          </div>
          <StatusBadge status={warning.status} />
        </div>

        <div>
          <span className="text-xs font-semibold text-muted-foreground block mb-0.5">Subject</span>
          <p className="font-bold text-foreground">{warning.subject}</p>
        </div>

        <div>
          <span className="text-xs font-semibold text-muted-foreground block mb-0.5">Details</span>
          <p className="text-foreground/90 whitespace-pre-line rounded-lg border border-border/60 p-3 bg-surface-elevated">
            {warning.description}
          </p>
        </div>

        {warning.actionRequired && (
          <div>
            <span className="text-xs font-semibold text-muted-foreground block mb-0.5">Action Required</span>
            <p className="text-foreground/90 whitespace-pre-line rounded-lg border border-border/60 p-3 bg-surface-elevated">
              {warning.actionRequired}
            </p>
          </div>
        )}

        {warning.employeeResponse && (
          <div>
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 block mb-0.5">
              Employee Response
            </span>
            <p className="text-foreground/90 whitespace-pre-line rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
              {warning.employeeResponse}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
          <span>Issued: {warning.issuedDate} by {warning.issuedByName ?? "HR"}</span>
          {warning.acknowledgedAt && (
            <span>Acknowledged: {new Date(warning.acknowledgedAt).toLocaleString()}</span>
          )}
        </div>
      </div>
    </Dialog>
  );
}

function AcknowledgeDialog({
  open,
  warning,
  onClose,
}: {
  open: boolean;
  warning: EmployeeWarning;
  onClose: () => void;
}) {
  const toast = useToast();
  const acknowledge = useAcknowledgeWarning();
  const [response, setResponse] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await acknowledge.mutateAsync({ id: warning.id, employeeResponse: response.trim() || undefined });
      toast.success("Warning acknowledged.");
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to acknowledge warning."));
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Acknowledge Warning">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg bg-surface-muted/60 p-3 text-xs space-y-1">
          <div className="font-semibold text-foreground">{warning.subject}</div>
          <div className="text-muted-foreground">Issued on {warning.issuedDate}</div>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">
            Your Response / Explanation (Optional)
          </label>
          <textarea
            rows={3}
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Add any explanation or acknowledgement note..."
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
            disabled={acknowledge.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
          >
            {acknowledge.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirm Acknowledgement
          </button>
        </div>
      </form>
    </Dialog>
  );
}
