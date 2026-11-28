import { useState, type FormEvent, type ReactNode } from "react";

import {
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Eye,
  FileCheck2,
  Loader2,
  LogOut,
  Mail,
  Plus,
  Search,
  Undo2,
  XCircle,
} from "lucide-react";

import { useAuth } from "@features/auth";
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
  useApproveResignation,
  useCompleteResignationExit,
  useMyResignations,
  useRejectResignation,
  useResignations,
  useResignationSummary,
  useSubmitResignation,
  useUpdateResignationClearance,
  useWithdrawResignation,
} from "../hooks";
import type {
  EmployeeResignation,
  ResignationReason,
  ResignationStatus,
  ResignationSubmitInput,
} from "../types";

const REASON_OPTIONS: Array<{ value: ResignationReason; label: string }> = [
  { value: "BETTER_OPPORTUNITY", label: "Better Opportunity" },
  { value: "PERSONAL", label: "Personal Reasons" },
  { value: "RELOCATION", label: "Relocation" },
  { value: "HEALTH", label: "Health Reasons" },
  { value: "HIGHER_STUDIES", label: "Higher Studies" },
  { value: "COMPENSATION", label: "Compensation" },
  { value: "OTHER", label: "Other" },
];

const STATUS_OPTIONS: Array<{ value: ResignationStatus; label: string; tone: string }> = [
  { value: "SUBMITTED", label: "Submitted", tone: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  { value: "NOTICE_PERIOD", label: "Notice Period", tone: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  { value: "COMPLETED", label: "Completed", tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  { value: "REJECTED", label: "Rejected", tone: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300" },
  { value: "WITHDRAWN", label: "Withdrawn", tone: "border-border bg-surface-muted text-muted-foreground" },
];

function StatusBadge({ status }: { status: ResignationStatus }) {
  const opt = STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0]!;
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${opt.tone}`}>
      {opt.label}
    </span>
  );
}

function reasonLabel(reason: ResignationReason): string {
  return REASON_OPTIONS.find((r) => r.value === reason)?.label ?? reason;
}

function ClearancePill({ done, label }: { done: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
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

export function ResignationsPage() {
  const { role } = useAuth();
  const isEmployee = role === "EMPLOYEE";
  const canReview = role === "ADMIN" || role === "HR" || role === "HR_HEAD" || role === "MANAGER";
  const canCompleteExit = role === "ADMIN" || role === "HR" || role === "HR_HEAD";
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [reasonCategory, setReasonCategory] = useState<ResignationReason | "">("");
  const [status, setStatus] = useState<ResignationStatus | "">("");
  const [search, setSearch] = useState("");
  const [submitOpen, setSubmitOpen] = useState(false);
  const [viewing, setViewing] = useState<EmployeeResignation | null>(null);
  const [approving, setApproving] = useState<EmployeeResignation | null>(null);
  const [rejecting, setRejecting] = useState<EmployeeResignation | null>(null);
  const [withdrawing, setWithdrawing] = useState<EmployeeResignation | null>(null);
  const [clearanceTarget, setClearanceTarget] = useState<EmployeeResignation | null>(null);

  const myResignations = useMyResignations(isEmployee);
  const summary = useResignationSummary(!isEmployee);
  const resignations = useResignations(
    {
      page,
      size: 10,
      reasonCategory: reasonCategory || undefined,
      status: status || undefined,
      search: search.trim() || undefined,
    },
    !isEmployee,
  );
  const completeExit = useCompleteResignationExit();

  async function handleCompleteExit(item: EmployeeResignation) {
    if (!window.confirm(`Complete final exit for "${item.employeeName}"? This will mark them Exited and disable portal login.`)) {
      return;
    }
    try {
      await completeExit.mutateAsync(item.id);
      toast.success("Employee exit completed.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to complete exit."));
    }
  }

  if (isEmployee) {
    const items = myResignations.data ?? [];
    const hasActive = items.some((r) => r.status === "SUBMITTED" || r.status === "NOTICE_PERIOD");
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-end gap-2">
          <RefreshButton
            onRefresh={() => myResignations.refetch()}
            isRefreshing={myResignations.isFetching}
            label="my resignations"
            className="h-10 w-10 rounded-xl"
          />
          {!hasActive && (
            <button
              type="button"
              onClick={() => setSubmitOpen(true)}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow transition hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Submit Resignation
            </button>
          )}
        </div>

        {myResignations.isLoading ? (
          <TableSkeleton rows={3} />
        ) : myResignations.isError ? (
          <Card className="p-6 text-center text-sm text-danger">
            {getApiErrorMessage(myResignations.error, "Failed to load your resignation records.")}
          </Card>
        ) : items.length === 0 ? (
          <Card className="p-10 text-center">
            <EmptyState
              title="No resignation requests"
              description="If you ever need to submit a resignation, you can do so here and track notice period & exit clearance."
            />
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((r) => (
              <Card key={r.id} className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-primary">{reasonLabel(r.reasonCategory)}</span>
                    <div className="text-sm font-bold text-foreground mt-0.5">
                      Submitted on {r.resignationDate}
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>

                <p className="text-sm text-foreground/90 whitespace-pre-line">{r.reasonDetails}</p>

                <div className="grid grid-cols-2 gap-3 rounded-lg bg-surface-muted/50 p-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Requested LWD</span>
                    <span className="font-semibold text-foreground">{r.requestedLastWorkingDay}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Approved LWD</span>
                    <span className="font-semibold text-foreground">{r.approvedLastWorkingDay ?? "Pending"}</span>
                  </div>
                </div>

                {r.status === "NOTICE_PERIOD" && (
                  <div className="flex flex-wrap gap-1.5">
                    <ClearancePill done={r.assetCleared} label={r.assetCleared ? "Assets Cleared" : "Assets Pending"} />
                    <ClearancePill done={r.handoverCleared} label={r.handoverCleared ? "Handover Done" : "Handover Pending"} />
                    <ClearancePill done={r.fnfSettled} label={r.fnfSettled ? "F&F Settled" : "F&F Pending"} />
                  </div>
                )}

                {r.hrRemarks && (
                  <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-2.5 text-xs">
                    <span className="font-semibold text-blue-700 dark:text-blue-300">HR Remarks: </span>
                    <span className="text-foreground/90">{r.hrRemarks}</span>
                  </div>
                )}

                {r.rejectionReason && (
                  <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-2.5 text-xs">
                    <span className="font-semibold text-rose-700 dark:text-rose-300">Rejection Reason: </span>
                    <span className="text-foreground/90">{r.rejectionReason}</span>
                  </div>
                )}

                {(r.status === "SUBMITTED" || r.status === "NOTICE_PERIOD") && (
                  <div className="flex justify-end border-t border-border/60 pt-3">
                    <button
                      type="button"
                      onClick={() => setWithdrawing(r)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-elevated"
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      Withdraw Resignation
                    </button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {submitOpen && <SubmitResignationDialog open={submitOpen} onClose={() => setSubmitOpen(false)} />}
        {withdrawing && (
          <WithdrawDialog open={Boolean(withdrawing)} resignation={withdrawing} onClose={() => setWithdrawing(null)} />
        )}
      </div>
    );
  }

  const list = resignations.data?.data ?? [];
  const meta = resignations.data?.meta;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <RefreshButton
          onRefresh={() => Promise.all([resignations.refetch(), summary.refetch()])}
          isRefreshing={resignations.isFetching || summary.isFetching}
          label="resignations"
          className="h-10 w-10 rounded-xl"
        />
        <button
          type="button"
          onClick={() => setSubmitOpen(true)}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow transition hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Submit Resignation
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Resignations"
          value={summary.data?.totalResignations ?? 0}
          icon={<LogOut className="h-5 w-5 text-primary" />}
        />
        <SummaryCard
          title="Pending Review"
          value={summary.data?.submittedCount ?? 0}
          icon={<Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
        />
        <SummaryCard
          title="Serving Notice"
          value={summary.data?.noticePeriodCount ?? 0}
          icon={<CalendarClock className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
        />
        <SummaryCard
          title="Pending Clearance"
          value={summary.data?.pendingClearanceCount ?? 0}
          icon={<ClipboardCheck className="h-5 w-5 text-rose-600 dark:text-rose-400" />}
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
            value={reasonCategory}
            onValueChange={(next) => {
              setReasonCategory(next as ResignationReason | "");
              setPage(1);
            }}
            options={[
              { value: "", label: "All Reasons" },
              ...REASON_OPTIONS.map((r) => ({ value: r.value, label: r.label })),
            ]}
            ariaLabel="Filter resignations by reason"
          />

          <AnimatedFilterSelect
            value={status}
            onValueChange={(next) => {
              setStatus(next as ResignationStatus | "");
              setPage(1);
            }}
            options={[
              { value: "", label: "All Statuses" },
              ...STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label })),
            ]}
            ariaLabel="Filter resignations by status"
          />
        </div>
      </Card>

      {resignations.isLoading ? (
        <TableSkeleton rows={6} />
      ) : resignations.isError ? (
        <Card className="p-6 text-center text-sm text-danger">
          {getApiErrorMessage(resignations.error, "Failed to load resignations.")}
        </Card>
      ) : list.length === 0 ? (
        <Card className="p-10 text-center">
          <EmptyState
            title="No resignation records found"
            description="Submitted resignations, notice periods, and exit clearances will appear here."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Dates & Notice</th>
                  <th className="px-4 py-3">Exit Clearance</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {list.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-muted/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-foreground">{r.employeeName}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {r.employeeCode} {r.employeeDepartment ? `• ${r.employeeDepartment}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 max-w-[230px]">
                      <div className="text-xs font-semibold text-foreground">{reasonLabel(r.reasonCategory)}</div>
                      <div className="text-xs text-muted-foreground truncate">{r.reasonDetails}</div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      <div>Resigned: <span className="font-medium text-foreground">{r.resignationDate}</span></div>
                      <div>
                        LWD:{" "}
                        <span className="font-medium text-foreground">
                          {r.approvedLastWorkingDay ?? r.requestedLastWorkingDay}
                        </span>{" "}
                        ({r.noticePeriodDays}d)
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        <ClearancePill done={r.assetCleared} label="Assets" />
                        <ClearancePill done={r.handoverCleared} label="KT" />
                        <ClearancePill done={r.accessRevoked} label="Access" />
                        <ClearancePill done={r.fnfSettled} label="F&F" />
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewing(r)}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-medium text-foreground hover:bg-surface-elevated transition shadow-sm"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                        {canReview && r.status === "SUBMITTED" && (
                          <>
                            <button
                              type="button"
                              onClick={() => setApproving(r)}
                              className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejecting(r)}
                              className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 transition"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </button>
                          </>
                        )}
                        {canCompleteExit && r.status === "NOTICE_PERIOD" && (
                          <>
                            <button
                              type="button"
                              onClick={() => setClearanceTarget(r)}
                              className="inline-flex h-8 items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-500/20 transition"
                            >
                              <ClipboardCheck className="h-3.5 w-3.5" />
                              Clearance
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCompleteExit(r)}
                              disabled={completeExit.isPending}
                              className="inline-flex h-8 items-center gap-1 rounded-lg bg-slate-900 dark:bg-primary px-2.5 text-xs font-semibold text-white hover:opacity-90 transition"
                            >
                              <FileCheck2 className="h-3.5 w-3.5" />
                              Complete Exit
                            </button>
                          </>
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

      {submitOpen && <SubmitResignationDialog open={submitOpen} onClose={() => setSubmitOpen(false)} />}
      {viewing && (
        <ResignationDetailDialog open={Boolean(viewing)} resignation={viewing} onClose={() => setViewing(null)} />
      )}
      {approving && (
        <ApproveResignationDialog open={Boolean(approving)} resignation={approving} onClose={() => setApproving(null)} />
      )}
      {rejecting && (
        <RejectResignationDialog open={Boolean(rejecting)} resignation={rejecting} onClose={() => setRejecting(null)} />
      )}
      {clearanceTarget && (
        <ClearanceDialog
          open={Boolean(clearanceTarget)}
          resignation={clearanceTarget}
          onClose={() => setClearanceTarget(null)}
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

function SubmitResignationDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const submit = useSubmitResignation();
  const today = new Date();
  const defaultLwd = new Date(today);
  defaultLwd.setDate(today.getDate() + 30);

  const [form, setForm] = useState<ResignationSubmitInput>({
    reasonCategory: "BETTER_OPPORTUNITY",
    reasonDetails: "",
    resignationDate: today.toISOString().slice(0, 10),
    requestedLastWorkingDay: defaultLwd.toISOString().slice(0, 10),
    noticePeriodDays: 30,
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.reasonDetails.trim()) {
      toast.error("Please enter your resignation details.");
      return;
    }
    try {
      await submit.mutateAsync(form);
      toast.success("Resignation submitted successfully.");
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to submit resignation."));
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Submit Resignation">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">
            Reason Category <span className="text-danger">*</span>
          </label>
          <Select
            value={form.reasonCategory}
            onChange={(e) => setForm((p) => ({ ...p, reasonCategory: e.target.value as ResignationReason }))}
          >
            {REASON_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Resignation Date</label>
            <DatePicker
              value={form.resignationDate ?? ""}
              onChange={(v) => setForm((p) => ({ ...p, resignationDate: v }))}
              ariaLabel="Resignation date"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Requested Last Working Day</label>
            <DatePicker
              value={form.requestedLastWorkingDay ?? ""}
              onChange={(v) => setForm((p) => ({ ...p, requestedLastWorkingDay: v }))}
              ariaLabel="Requested last working day"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">
            Detailed Reason / Resignation Note <span className="text-danger">*</span>
          </label>
          <textarea
            rows={4}
            value={form.reasonDetails}
            onChange={(e) => setForm((p) => ({ ...p, reasonDetails: e.target.value }))}
            placeholder="Share your reason and handover plan..."
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
            disabled={submit.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
          >
            {submit.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Submit Resignation
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function ApproveResignationDialog({
  open,
  resignation,
  onClose,
}: {
  open: boolean;
  resignation: EmployeeResignation;
  onClose: () => void;
}) {
  const toast = useToast();
  const approve = useApproveResignation();
  const [approvedLwd, setApprovedLwd] = useState(resignation.requestedLastWorkingDay);
  const [hrRemarks, setHrRemarks] = useState("");
  const [sendEmail, setSendEmail] = useState(true);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await approve.mutateAsync({
        id: resignation.id,
        input: { approvedLastWorkingDay: approvedLwd, hrRemarks, sendEmail },
      });
      toast.success("Resignation approved and notice period started.");
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to approve resignation."));
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={`Approve Resignation — ${resignation.employeeName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">
            Approved Last Working Day
          </label>
          <DatePicker
            value={approvedLwd}
            onChange={setApprovedLwd}
            ariaLabel="Approved last working day"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">HR Remarks (Optional)</label>
          <textarea
            rows={3}
            value={hrRemarks}
            onChange={(e) => setHrRemarks(e.target.value)}
            placeholder="Handover instructions, notice period notes..."
            className="w-full rounded-lg border border-border bg-surface-elevated p-2.5 text-sm text-foreground shadow outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <label className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-surface-muted/40 px-3 py-2.5 text-xs font-medium text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={sendEmail}
            onChange={(e) => setSendEmail(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          <Mail className="h-4 w-4 text-primary" />
          Send acceptance & notice period email to employee
        </label>

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
            disabled={approve.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
          >
            {approve.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Approve & Start Notice
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function RejectResignationDialog({
  open,
  resignation,
  onClose,
}: {
  open: boolean;
  resignation: EmployeeResignation;
  onClose: () => void;
}) {
  const toast = useToast();
  const reject = useRejectResignation();
  const [reason, setReason] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Please enter a rejection reason.");
      return;
    }
    try {
      await reject.mutateAsync({ id: resignation.id, rejectionReason: reason.trim() });
      toast.success("Resignation rejected.");
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to reject resignation."));
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={`Reject Resignation — ${resignation.employeeName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">
            Rejection Reason <span className="text-danger">*</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for rejecting resignation..."
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
            disabled={reject.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-rose-700 disabled:opacity-50"
          >
            {reject.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Reject Resignation
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function WithdrawDialog({
  open,
  resignation,
  onClose,
}: {
  open: boolean;
  resignation: EmployeeResignation;
  onClose: () => void;
}) {
  const toast = useToast();
  const withdraw = useWithdrawResignation();
  const [reason, setReason] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await withdraw.mutateAsync({ id: resignation.id, withdrawalReason: reason.trim() || undefined });
      toast.success("Resignation withdrawn.");
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to withdraw resignation."));
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Withdraw Resignation">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Withdrawing your resignation will cancel the exit request and keep your status as{" "}
          <strong className="text-emerald-600">Active</strong>.
        </p>
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">Note (Optional)</label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for withdrawing..."
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
            disabled={withdraw.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
          >
            {withdraw.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirm Withdraw
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function ClearanceDialog({
  open,
  resignation,
  onClose,
}: {
  open: boolean;
  resignation: EmployeeResignation;
  onClose: () => void;
}) {
  const toast = useToast();
  const updateClearance = useUpdateResignationClearance();
  const [assetCleared, setAssetCleared] = useState(resignation.assetCleared);
  const [handoverCleared, setHandoverCleared] = useState(resignation.handoverCleared);
  const [accessRevoked, setAccessRevoked] = useState(resignation.accessRevoked);
  const [fnfSettled, setFnfSettled] = useState(resignation.fnfSettled);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await updateClearance.mutateAsync({
        id: resignation.id,
        input: { assetCleared, handoverCleared, accessRevoked, fnfSettled },
      });
      toast.success("Exit clearance updated.");
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update clearance."));
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={`Exit Clearance — ${resignation.employeeName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2.5 text-sm">
          <label className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-surface-muted/40">
            <input type="checkbox" checked={assetCleared} onChange={(e) => setAssetCleared(e.target.checked)} className="h-4 w-4 accent-primary" />
            <div>
              <div className="font-semibold text-foreground">Company Assets Returned</div>
              <div className="text-xs text-muted-foreground">Laptop, SIM card, ID card & visiting cards</div>
            </div>
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-surface-muted/40">
            <input type="checkbox" checked={handoverCleared} onChange={(e) => setHandoverCleared(e.target.checked)} className="h-4 w-4 accent-primary" />
            <div>
              <div className="font-semibold text-foreground">Knowledge Transfer (KT) & Handover</div>
              <div className="text-xs text-muted-foreground">Tasks, documents & client handover complete</div>
            </div>
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-surface-muted/40">
            <input type="checkbox" checked={accessRevoked} onChange={(e) => setAccessRevoked(e.target.checked)} className="h-4 w-4 accent-primary" />
            <div>
              <div className="font-semibold text-foreground">Portal & Email Access Revoked</div>
              <div className="text-xs text-muted-foreground">HRM login, official email, and tools disabled</div>
            </div>
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-surface-muted/40">
            <input type="checkbox" checked={fnfSettled} onChange={(e) => setFnfSettled(e.target.checked)} className="h-4 w-4 accent-primary" />
            <div>
              <div className="font-semibold text-foreground">Full & Final (F&F) Settled</div>
              <div className="text-xs text-muted-foreground">Final payroll, dues & relieving letter complete</div>
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

function ResignationDetailDialog({
  open,
  resignation,
  onClose,
}: {
  open: boolean;
  resignation: EmployeeResignation;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={`Resignation — ${resignation.employeeName}`}>
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-muted/50 p-3">
          <div>
            <div className="font-semibold text-foreground">{reasonLabel(resignation.reasonCategory)}</div>
            <div className="text-xs text-muted-foreground">
              Resigned: {resignation.resignationDate} • LWD: {resignation.approvedLastWorkingDay ?? resignation.requestedLastWorkingDay}
            </div>
          </div>
          <StatusBadge status={resignation.status} />
        </div>

        <div>
          <span className="text-xs font-semibold text-muted-foreground block mb-0.5">Resignation Note</span>
          <p className="text-foreground/90 whitespace-pre-line rounded-lg border border-border/60 p-3 bg-surface-elevated">
            {resignation.reasonDetails}
          </p>
        </div>

        {resignation.hrRemarks && (
          <div>
            <span className="text-xs font-semibold text-muted-foreground block mb-0.5">HR Remarks</span>
            <p className="text-foreground/90 whitespace-pre-line rounded-lg border border-border/60 p-3 bg-surface-elevated">
              {resignation.hrRemarks}
            </p>
          </div>
        )}

        {resignation.rejectionReason && (
          <div>
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-300 block mb-0.5">Rejection Reason</span>
            <p className="text-foreground/90 whitespace-pre-line rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
              {resignation.rejectionReason}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <ClearancePill done={resignation.assetCleared} label={resignation.assetCleared ? "Assets Cleared" : "Assets Pending"} />
          <ClearancePill done={resignation.handoverCleared} label={resignation.handoverCleared ? "KT Done" : "KT Pending"} />
          <ClearancePill done={resignation.accessRevoked} label={resignation.accessRevoked ? "Access Revoked" : "Access Active"} />
          <ClearancePill done={resignation.fnfSettled} label={resignation.fnfSettled ? "F&F Settled" : "F&F Pending"} />
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
          <span>{resignation.reviewedByName ? `Reviewed by ${resignation.reviewedByName}` : "Pending review"}</span>
          <span>{resignation.emailSent ? "Acceptance email sent" : "No email sent"}</span>
        </div>
      </div>
    </Dialog>
  );
}
