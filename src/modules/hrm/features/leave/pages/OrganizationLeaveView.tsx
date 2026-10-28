import { useState } from "react";

import { ArrowLeft, ArrowRight, RefreshCw, Search } from "lucide-react";

import { Select } from "@hrm/components/ui/select";

import { useToast } from "@shared/components/feedback";
import { AnimatedFilterSelect, AnimatedNumber, DateRangePickerPopup, type DateRangeValue } from "@shared/components/ui";
import { useDebouncedValue } from "@shared/hooks";

import { LeaveApprovalDialog } from "../components/LeaveApprovalDialog";
import { LeaveRequestTable } from "../components/LeaveRequestTable";
import { useLeaveRequests, useLeaveSummary } from "../hooks";
import { useMyProfile } from "@features/auth";

import type { LeaveRequest } from "../types";

interface OrganizationLeaveViewProps {
  role: string | null | undefined;
}

export function OrganizationLeaveView({ role }: OrganizationLeaveViewProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterStatus, setFilterStatus] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [approvalTarget, setApprovalTarget] = useState<LeaveRequest | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<DateRangeValue>({ from: "", to: "" });
  const toast = useToast();
  const canApprove = role === "ADMIN" || role === "HR" || role === "HR_HEAD" || role === "SUB_HR";
  const summary = useLeaveSummary();
  const { data: myProfile, refetch: refetchProfile } = useMyProfile();
  const debouncedEmployeeSearch = useDebouncedValue(employeeSearch, 300);

  const {
    data: requestsData,
    isLoading,
    isFetching: requestsFetching,
    error,
    refetch,
  } = useLeaveRequests({
    page,
    size: pageSize,
    ...(filterStatus ? { status: filterStatus as "PENDING" | "APPROVED" | "REJECTED" } : {}),
    ...(debouncedEmployeeSearch.trim() ? { employeeSearch: debouncedEmployeeSearch.trim() } : {}),
    ...(dateRange.from ? { startDate: dateRange.from } : {}),
    ...(dateRange.to ? { endDate: dateRange.to } : {}),
    sort: "appliedDate,desc",
    scope: "accessible",
  });

  const totalPages = requestsData?.meta?.totalPages ?? 1;
  const requestsRefreshing = requestsFetching && !isLoading;
  const summaryRefreshing = summary.isFetching && !summary.isLoading;
  const totalElements = requestsData?.meta?.totalElements ?? requestsData?.data?.length ?? 0;

  async function handleRefresh() {
    if (isRefreshing || isLoading) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetch(),
        summary.refetch(),
        refetchProfile ? refetchProfile() : Promise.resolve(),
      ]);
      toast.success("Refresh successfully");
    } catch {
      toast.error("Failed to refresh leave");
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Leave Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">View and manage all leave requests.</p>
        </div>
        <RefreshIconButton
          refreshing={isRefreshing || isLoading}
          onClick={() => void handleRefresh()}
        />
      </div>

      <section
        className={`grid grid-cols-2 gap-4 transition-opacity lg:grid-cols-4 ${
          summaryRefreshing ? "pointer-events-none opacity-60" : ""
        }`}
        aria-label="Leave summary"
        aria-busy={summaryRefreshing}
      >
        {[
          ["Pending", summary.data?.pending ?? "—", "text-warning"],
          ["Approved this month", summary.data?.approvedThisMonth ?? "—", "text-success"],
          ["Rejected this month", summary.data?.rejectedThisMonth ?? "—", "text-danger"],
          ["On leave today", summary.data?.onLeaveToday ?? "—", "text-primary"],
        ].map(([label, value, tone]) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5 shadow">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className={`mt-2 text-3xl font-extrabold ${tone}`}>
                    <AnimatedNumber value={value ?? "—"} />
                  </p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-card p-3 shadow">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={employeeSearch}
              onChange={(event) => {
                setEmployeeSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search by employee email or employee ID"
              aria-label="Search leave requests by employee email or employee ID"
              className="mbg-filter-control h-11 w-full rounded-xl border border-border bg-surface-elevated pl-10 pr-4 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="grid w-full grid-cols-2 gap-3 lg:w-[360px] lg:shrink-0">
            <DateRangePickerPopup
              value={dateRange}
              onChange={setDateRange}
              placeholder="Select Date"
              buttonClassName="w-full"
            />
            <AnimatedFilterSelect
              value={filterStatus}
              onValueChange={(value) => {
                setFilterStatus(value);
                setPage(1);
              }}
              options={[
                { value: "", label: "Status" },
                { value: "PENDING", label: "Pending" },
                { value: "APPROVED", label: "Approved" },
                { value: "REJECTED", label: "Rejected" },
              ]}
              ariaLabel="Filter leave requests by status"
            />
          </div>
        </div>
      </section>

      <div
        className={`transition-opacity ${requestsRefreshing ? "pointer-events-none opacity-60" : ""}`}
        aria-busy={requestsRefreshing}
      >
      <LeaveRequestTable
        requests={requestsData?.data}
        isLoading={isLoading}
        error={error}
        showEmployee
        onRetry={() => void refetch()}
        {...(canApprove
          ? {
              renderActions: (req) => {
                const isOwnRequest = myProfile && req.employeeId === myProfile.id;
                if (isOwnRequest) {
                  return (
                    <span className="inline-flex items-center rounded-md bg-warning-soft px-2 py-1 text-xs font-medium text-warning" title="You cannot approve your own leave request">
                      Admin Review Required
                    </span>
                  );
                }
                return req.status === "PENDING" ? (
                  <button
                    type="button"
                    onClick={() => setApprovalTarget(req)}
                    className="cursor-pointer rounded-lg border border-warning bg-warning-soft px-3 py-1.5 text-xs font-semibold text-warning shadow transition-all hover:brightness-95"
                  >
                    Review
                  </button>
                ) : (
                  <span className="inline-flex items-center rounded-md bg-surface-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                    Processed
                  </span>
                );
              },
            }
          : {})}
      />
      </div>

      {totalElements > 0 ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-5 py-3 text-xs sm:flex-row sm:items-center sm:justify-between shadow">
          <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
            <span>
              Showing <strong>{(page - 1) * pageSize + 1}</strong>–
              <strong>{Math.min(page * pageSize, totalElements)}</strong> of{" "}
              <strong>{totalElements.toLocaleString()}</strong> requests
            </span>
            <div className="flex items-center gap-2">
              <span>Per page:</span>
              <Select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-lg border border-border bg-surface-elevated px-2 py-1 text-xs font-medium text-foreground"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-elevated px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowLeft size={13} />
              Previous
            </button>
            {getPageNumbers(page, totalPages).map((item, idx) =>
              item === "ellipsis" ? (
                <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground">
                  ...
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  disabled={isLoading}
                  onClick={() => setPage(item)}
                  className={`grid h-7 min-w-[28px] place-items-center rounded-lg text-xs font-medium transition-colors ${
                    item === page
                      ? "bg-primary text-primary-foreground shadow"
                      : "border border-border bg-surface-elevated text-foreground hover:bg-surface-hover"
                  }`}
                >
                  {item}
                </button>
              )
            )}
            <button
              type="button"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-elevated px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      ) : null}

      <LeaveApprovalDialog
        open={!!approvalTarget}
        onClose={() => setApprovalTarget(null)}
        request={approvalTarget}
      />
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

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];

  if (current > 3) {
    pages.push("ellipsis");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push("ellipsis");
  }

  pages.push(total);

  return pages;
}

