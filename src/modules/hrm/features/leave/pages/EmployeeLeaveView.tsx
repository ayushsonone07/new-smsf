import { useState } from "react";

import { Plus, RefreshCw } from "lucide-react";

import { useToast } from "@shared/components/feedback";
import { PageHeader } from "@shared/components/ui";
import { getApiErrorMessage } from "@shared/lib";

import { ApplyLeaveDialog } from "../components/ApplyLeaveDialog";
import { LeaveBalanceCards } from "../components/LeaveBalanceCards";
import { LeaveRequestTable } from "../components/LeaveRequestTable";
import { useCancelLeave, useLeaveBalances, useLeaveRequests } from "../hooks";

export function EmployeeLeaveView() {
  const [showApply, setShowApply] = useState(false);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const balances = useLeaveBalances();
  const { data: balanceData, isLoading: balanceLoading, error: balanceError } = balances;
  const {
    data: requestsData,
    isLoading: requestsLoading,
    isFetching: requestsFetching,
    error: requestsError,
    refetch,
  } = useLeaveRequests({ page, size: 10, scope: "self" });
  const balancesRefreshing = balances.isFetching && !balanceLoading;
  const requestsRefreshing = requestsFetching && !requestsLoading;
  const cancelLeave = useCancelLeave();
  const toast = useToast();

  const totalPages = requestsData?.meta?.totalPages ?? 1;

  function handleCancel(id: number) {
    cancelLeave.mutate(id, {
      onSuccess: () => toast.success("Leave request cancelled."),
      onError: (err) => toast.error(getApiErrorMessage(err, "Failed to cancel leave request.")),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Leave"
        description="View your leave balance and manage requests."
        actions={
          <div className="flex items-center gap-2">
            <RefreshIconButton
              refreshing={refreshing || requestsLoading}
              onClick={async () => {
                setRefreshing(true);
                try {
                  // Reload both parts of the page: leave balances and the request list.
                  await Promise.all([refetch(), balances.refetch()]);
                  toast.success("Refresh successfully");
                } finally {
                  setRefreshing(false);
                }
              }}
            />
            <button
              type="button"
              onClick={() => setShowApply(true)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-all hover:brightness-110"
            >
              <Plus size={18} />
              Apply for Leave
            </button>
          </div>
        }
      />

      <section
        aria-label="Leave balances"
        aria-busy={balancesRefreshing}
        className={`transition-opacity ${balancesRefreshing ? "pointer-events-none opacity-60" : ""}`}
      >
        <LeaveBalanceCards balances={balanceData} isLoading={balanceLoading} error={balanceError} />
      </section>

      <section
        aria-label="Leave requests"
        aria-busy={requestsRefreshing}
        className={`transition-opacity ${requestsRefreshing ? "pointer-events-none opacity-60" : ""}`}
      >
        <LeaveRequestTable
          requests={requestsData?.data}
          isLoading={requestsLoading}
          error={requestsError}
          onRetry={() => void refetch()}
          renderActions={(req) =>
            req.status === "PENDING" ? (
              <button
                type="button"
                onClick={() => handleCancel(req.id)}
                disabled={cancelLeave.isPending}
                className="cursor-pointer rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-card-foreground shadow transition-all hover:bg-danger-soft hover:text-danger hover:border-danger disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )
          }
        />
        {totalPages > 1 ? (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="cursor-pointer rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-card-foreground shadow transition-all hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="cursor-pointer rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-card-foreground shadow transition-all hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              Next
            </button>
          </div>
        ) : null}
      </section>

      <ApplyLeaveDialog open={showApply} onClose={() => setShowApply(false)} />
    </div>
  );
}

function RefreshIconButton({ refreshing, onClick }: { refreshing: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (!refreshing) {
          void onClick();
        }
      }}
      disabled={refreshing}
      aria-label="Refresh leave"
      title="Refresh leave"
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface-elevated text-foreground transition-colors hover:border-border-strong hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
    >
      <RefreshCw size={17} className={refreshing ? "animate-spin" : ""} />
    </button>
  );
}
