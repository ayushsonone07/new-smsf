import { useState } from "react";

import { ReceiptText, RefreshCw } from "lucide-react";

import { useToast } from "@shared/components/feedback";
import { ErrorDisplay, PageHeader } from "@shared/components/ui";
import { getApiErrorMessage } from "@shared/lib";

import { PayrollDetailsDialog } from "../components/PayrollDetailsDialog";
import { PayrollTable } from "../components/PayrollTable";
import { usePayrolls } from "../hooks";

import type { Payroll } from "../types";

export function MyPayrollView() {
  const [page, setPage] = useState(1);
  const [details, setDetails] = useState<Payroll | null>(null);

  const { data, isLoading, error, refetch } = usePayrolls({ page, size: 10, sort: "createdAt,desc" });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const toast = useToast();

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success("Payroll refreshed", "The latest payroll records were loaded.");
    } catch (err) {
      toast.error("Couldn't refresh payroll", getApiErrorMessage(err, "Unable to refresh"));
    } finally {
      setIsRefreshing(false);
    }
  }

  const totalPages = Math.max(1, data?.meta.totalPages ?? 1);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Self service"
        title="My Payroll"
        description="Your payroll records, scoped to what you are allowed to see."
        actions={
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
        }
      />

      {error ? <ErrorDisplay message={getApiErrorMessage(error, "Failed to load payroll records.")} /> : null}

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ReceiptText className="h-4 w-4" />
        Payroll records are snapshots — past months never change when your salary structure is updated.
      </div>

      <PayrollTable
        payrolls={data?.data}
        loading={isLoading}
        onDetails={(p) => setDetails(p)}
        emptyMessage="No payroll records found for your scope yet."
      />

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

      <PayrollDetailsDialog open={details !== null} payroll={details} onClose={() => setDetails(null)} />
    </div>
  );
}