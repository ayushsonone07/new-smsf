import { useState } from "react";

import { CalendarRange, CheckCircle2, Loader2, Plus, RefreshCw, Search, SlidersHorizontal, Wallet } from "lucide-react";

import { useRole } from "@features/auth";
import { useToast } from "@shared/components/feedback";
import { AnimatedFilterSelect, ErrorDisplay, PageHeader } from "@shared/components/ui";
import { getApiErrorMessage } from "@shared/lib";

import { BulkPaymentDialog } from "../components/BulkPaymentDialog";
import { GeneratePayrollDialog } from "../components/GeneratePayrollDialog";
import { MarkPaidDialog } from "../components/MarkPaidDialog";
import { PayrollDetailsDialog } from "../components/PayrollDetailsDialog";
import { PayrollStagePills, PayrollSummaryCards } from "../components/PayrollSummaryCards";
import { payrollActionButtons, PayrollTable } from "../components/PayrollTable";
import { SalaryStructureDialog } from "../components/SalaryStructureDialog";
import {
  useApprovePayroll,
  useBulkApprovePayroll,
  useCancelPayroll,
  usePayrollSummary,
  usePayrolls,
  useProcessPayroll,
} from "../hooks";
import { toYearMonth } from "../lib/payrollFormat";

import type { Payroll, PayrollStatus } from "../types";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 4 }, (_, i) => CURRENT_YEAR - i);
const MONTH_OPTIONS = [
  { value: "", label: "All months" },
  ...MONTHS.map((m) => ({
    value: String(m),
    label: new Date(2000, m - 1, 1).toLocaleString("en-US", { month: "short" }),
  })),
];
const YEAR_OPTIONS = [
  { value: "", label: "All years" },
  ...YEARS.map((y) => ({ value: String(y), label: String(y) })),
];
const STATUS_OPTIONS: { value: PayrollStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "CALCULATED", label: "Calculated" },
  { value: "APPROVED", label: "Approved" },
  { value: "PROCESSED", label: "Processed" },
  { value: "PAID", label: "Paid" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function PayrollManagementView() {
  const today = toYearMonth(new Date());
  const [page, setPage] = useState(1);
  const [month, setMonth] = useState<number | "">(today.month);
  const [year, setYear] = useState<number | "">(today.year);
  const [status, setStatus] = useState<PayrollStatus | "">("");
  const [q, setQ] = useState("");
  const [showGenerate, setShowGenerate] = useState(false);
  const [showStructure, setShowStructure] = useState(false);
  const [details, setDetails] = useState<Payroll | null>(null);
  const [paying, setPaying] = useState<Payroll | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showBulkPay, setShowBulkPay] = useState(false);

  const canManage = useRole(["HR_HEAD", "HR", "ADMIN"]);

  const { data, isLoading, isFetching, error, refetch } = usePayrolls({
    page,
    size: 10,
    month,
    year,
    status,
    ...(q.trim() ? { q: q.trim() } : {}),
  });
  const summary = usePayrollSummary(month === "" ? today.month : month, year === "" ? today.year : year);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const payrollsRefreshing = isFetching && !isLoading;
  const summaryRefreshing = summary.isFetching && !summary.isLoading;

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await Promise.all([refetch(), summary.refetch()]);
      toast.success("Payroll refreshed", "The latest payroll data was loaded.");
    } catch (err) {
      toast.error("Couldn't refresh payroll", getApiErrorMessage(err, "Unable to refresh"));
    } finally {
      setIsRefreshing(false);
    }
  }

  const approve = useApprovePayroll();
  const bulkApprove = useBulkApprovePayroll();
  const process = useProcessPayroll();
  const cancel = useCancelPayroll();
  const toast = useToast();

  const totalPages = Math.max(1, data?.meta.totalPages ?? 1);

  const selectedPayrolls = (data?.data ?? []).filter((p) => selectedIds.includes(p.id));

  function handleToggleSelect(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function handleToggleSelectAll() {
    const pageItems = data?.data ?? [];
    if (selectedIds.length === pageItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pageItems.map((p) => p.id));
    }
  }

  function handleBulkApprove() {
    if (selectedIds.length === 0) return;
    bulkApprove.mutate(
      { payrollIds: selectedIds },
      {
        onSuccess: (res) => {
          toast.success(res.message || `Approved ${selectedIds.length} payroll(s).`);
          setSelectedIds([]);
          void refetch();
          void summary.refetch();
        },
        onError: (err) => {
          toast.error(getApiErrorMessage(err, "Failed to bulk approve payrolls."));
        },
      },
    );
  }

  function runTransition<T>(mutation: { mutate: (v: T, o: { onSuccess: () => void; onError: (e: unknown) => void }) => void }, value: T, message: string) {
    mutation.mutate(value, {
      onSuccess: () => toast.success(message),
      onError: (err) => toast.error(getApiErrorMessage(err, "Action failed.")),
    });
  }

  function confirmCancel(p: Payroll) {
    const ok = window.confirm(`Cancel payroll for ${p.employeeCode} (${p.payrollMonth}/${p.payrollYear})? This cannot be undone.`);
    if (ok) runTransition(cancel, p.id, `Payroll ${p.employeeCode} cancelled.`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Payroll"
        description="Generate monthly payroll runs and manage the approval-to-payment workflow."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={isRefreshing}
              aria-label="Refresh payroll"
              title="Refresh payroll"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow transition hover:bg-muted disabled:opacity-75"
            >
              <RefreshCw size={18} className={isRefreshing ? "animate-spin" : undefined} />
            </button>
            {canManage ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowStructure(true)}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  <SlidersHorizontal size={18} />
                  Salary Structures
                </button>
                <button
                  type="button"
                  onClick={() => setShowGenerate(true)}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-all hover:brightness-110"
                >
                  <Plus size={18} />
                  Generate Payroll
                </button>
              </>
            ) : null}
          </div>
        }
      />

      {summary.data ? (
        <div
          className={`space-y-6 transition-opacity ${summaryRefreshing ? "pointer-events-none opacity-60" : ""}`}
          aria-busy={summaryRefreshing}
        >
          <PayrollSummaryCards summary={summary.data} />
          <PayrollStagePills summary={summary.data} />
        </div>
      ) : null}

     <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-muted/40 p-4 lg:flex-row lg:items-center">
  {/* Search */}
  <label className="relative min-w-0 flex-1">
    <Search
      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      size={16}
    />
    <input
      type="search"
      value={q}
      onChange={(e) => {
        setQ(e.target.value);
        setPage(1);
      }}
      placeholder="Search name, email, code…"
      className="block h-10 w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground shadow placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
    />
  </label>

  {/* Filters */}
  <div className="flex shrink-0 items-center gap-2">
    <CalendarRange
      className="hidden h-4 w-4 shrink-0 text-muted-foreground xl:block"
    />

    {/* Month */}
    <AnimatedFilterSelect
      value={month === "" ? "" : String(month)}
      onValueChange={(nextMonth) => {
        setMonth(nextMonth === "" ? "" : Number(nextMonth));
        setPage(1);
      }}
      options={MONTH_OPTIONS}
      ariaLabel="Filter by month"
      className="w-[132px]"
    />

    {/* Year */}
    <AnimatedFilterSelect
      value={year === "" ? "" : String(year)}
      onValueChange={(nextYear) => {
        setYear(nextYear === "" ? "" : Number(nextYear));
        setPage(1);
      }}
      options={YEAR_OPTIONS}
      ariaLabel="Filter by year"
      className="w-[120px]"
    />

    {/* Status */}
    <AnimatedFilterSelect
      value={status}
      onValueChange={(nextStatus) => {
        setStatus(nextStatus as PayrollStatus | "");
        setPage(1);
      }}
      options={STATUS_OPTIONS}
      ariaLabel="Filter by status"
      className="w-[180px]"
    />
  </div>
</div>

      {error ? <ErrorDisplay message={getApiErrorMessage(error, "Failed to load payrolls.")} /> : null}

      <div
        className={`transition-opacity ${payrollsRefreshing ? "pointer-events-none opacity-60" : ""}`}
        aria-busy={payrollsRefreshing}
      >
      <PayrollTable
        payrolls={data?.data}
        loading={isLoading}
        onDetails={(p) => setDetails(p)}
        renderActions={(p) =>
          canManage
            ? payrollActionButtons(p, {
                onApprove: (pp) =>
                  runTransition(approve, pp.id, `Payroll ${pp.employeeCode} approved.`),
                onProcess: (pp) =>
                  runTransition(process, pp.id, `Payroll ${pp.employeeCode} processed.`),
                onMarkPaid: (pp) => setPaying(pp),
                onCancel: confirmCancel,
              })
            : null
        }
        emptyMessage="No payroll records match the current filters. Generate payroll for a month to get started."
      />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Page {data?.meta.totalElements ? page : 0} of {totalPages}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((prev) => prev - 1)}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => prev + 1)}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      <GeneratePayrollDialog open={showGenerate} onClose={() => setShowGenerate(false)} />
      <SalaryStructureDialog open={showStructure} onClose={() => setShowStructure(false)} />
      <PayrollDetailsDialog open={details !== null} payroll={details} onClose={() => setDetails(null)} />
      <MarkPaidDialog open={paying !== null} payroll={paying} onClose={() => setPaying(null)} />

      {canManage ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Wallet className="h-3.5 w-3.5" />
          Payments are recorded when a processed payroll is marked as paid.
        </p>
      ) : null}
    </div>
  );
}