import { useState } from "react";
import { Clock, Eye, User } from "lucide-react";

import { Dialog, ErrorDisplay, TableSkeleton } from "@shared/components/ui";

import { LeaveStatusBadge } from "./LeaveStatusBadge";

import type { LeaveRequest } from "../types";

interface LeaveRequestTableProps {
  requests: LeaveRequest[] | undefined;
  isLoading: boolean;
  error: Error | null;
  showEmployee?: boolean;
  renderActions?: (request: LeaveRequest) => React.ReactNode;
  onRetry?: () => void;
}

export function LeaveRequestTable({
  requests,
  isLoading,
  error,
  showEmployee = false,
  renderActions,
  onRetry,
}: LeaveRequestTableProps) {
  const [viewTarget, setViewTarget] = useState<LeaveRequest | null>(null);

  if (isLoading) return <TableSkeleton rows={5} />;
  if (error) return (
    <div className="space-y-3">
      <ErrorDisplay message="Leave requests could not be loaded." />
      {onRetry ? <button type="button" onClick={onRetry} className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold">Retry</button> : null}
    </div>
  );
  const displayRequests = requests ?? [];
  if (displayRequests.length === 0) {
    return <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">No leave requests match this view.</div>;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50  text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {showEmployee ? <th className="px-4 py-3">Employee</th> : null}
              <th className="px-4 py-3">Leave Type</th>
              <th className="px-4 py-3">Date Range</th>
              <th className="px-4 py-3 text-center">Days</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Applied</th>
              <th className="px-4 py-3">Status</th>
              {showEmployee ? <th className="px-4 py-3">Approved By / At</th> : null}
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {displayRequests.map((req) => (
              <tr key={req.id} className="transition-colors hover:bg-surface-hover/70">
                {showEmployee ? (
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User size={14} className="shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{req.employeeName}</p>
                        {req.employeeDepartment ? (
                          <p className="truncate text-xs text-muted-foreground">{req.employeeDepartment}</p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                ) : null}
                <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                  {formatLeaveType(req.leaveType)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {formatDate(req.startDate)} – {formatDate(req.endDate)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-center text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-md bg-surface-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    <Clock size={12} />
                    {req.numberOfDays}
                    {req.halfDay ? " Half-day" : ""}
                  </span>
                </td>
                <td className="max-w-[200px] truncate px-4 py-3 text-muted-foreground" title={req.reason}>
                  {req.reason}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {formatDate(req.appliedDate)}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex items-center gap-2">
                    <LeaveStatusBadge status={req.status} />
                    <button
                      type="button"
                      onClick={() => setViewTarget(req)}
                      title="View Details"
                      className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow transition-all hover:bg-primary-soft hover:text-primary hover:border-primary/30"
                    >
                      <Eye size={13} />
                    </button>
                  </div>
                </td>
                {showEmployee ? (
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {req.approvedBy ? (
                      <div>
                        <p className="font-medium text-foreground">{req.approvedBy}</p>
                        {req.approvedDate ? <p className="text-xs text-muted-foreground">{formatDate(req.approvedDate)}</p> : null}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                ) : null}
                <td className="whitespace-nowrap px-4 py-3 text-center">
                  {renderActions ? renderActions(req) ?? <span className="text-muted-foreground">—</span> : <span className="text-muted-foreground">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <LeaveDetailDialog open={!!viewTarget} onClose={() => setViewTarget(null)} request={viewTarget} />
    </>
  );
}

function LeaveDetailDialog({ open, onClose, request }: { open: boolean; onClose: () => void; request: LeaveRequest | null }) {
  if (!request) return null;
  return (
    <Dialog open={open} onClose={onClose} title="Leave Request Details" size="sm">
      <div className="space-y-4 p-6 text-sm">
        <div className="flex items-center justify-between rounded-xl bg-surface-muted px-4 py-3">
          <div>
            <p className="font-bold text-foreground">{request.employeeName ?? "Employee"}</p>
            <p className="text-xs text-muted-foreground font-mono">{request.employeeCode ?? ""}</p>
          </div>
          <LeaveStatusBadge status={request.status} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs font-semibold text-muted-foreground">Leave Type</p>
            <p className="mt-1 font-bold text-foreground">{formatLeaveType(request.leaveType)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs font-semibold text-muted-foreground">Total Days</p>
            <p className="mt-1 font-bold text-foreground">{request.numberOfDays} Day(s)</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs font-semibold text-muted-foreground">Date Range</p>
          <p className="mt-1 font-medium text-foreground">{formatDate(request.startDate)} – {formatDate(request.endDate)}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs font-semibold text-muted-foreground">Reason</p>
          <p className="mt-1 text-foreground whitespace-pre-wrap">{request.reason || "—"}</p>
        </div>

        {request.approvedBy ? (
          <div className={`rounded-xl border p-3 ${request.status === "REJECTED" ? "border-danger/30 bg-danger-soft/30" : "border-success/30 bg-success-soft/30"}`}>
            <p className={`text-xs font-semibold ${request.status === "REJECTED" ? "text-danger" : "text-success"}`}>
              {request.status === "REJECTED" ? "Rejected By" : "Approved By"}
            </p>
            <p className="mt-1 font-bold text-foreground">{request.approvedBy} {request.approvedDate ? `on ${formatDate(request.approvedDate)}` : ""}</p>
          </div>
        ) : null}

        {request.rejectionReason ? (
          <div className="rounded-xl border border-danger/30 bg-danger-soft/50 p-3">
            <p className="text-xs font-semibold text-danger">Rejection Reason</p>
            <p className="mt-1 text-danger whitespace-pre-wrap">{request.rejectionReason}</p>
          </div>
        ) : null}

        {request.reviewerNote ? (
          <div className="rounded-xl border border-border bg-surface-muted p-3">
            <p className="text-xs font-semibold text-muted-foreground">Reviewer Note</p>
            <p className="mt-1 text-foreground whitespace-pre-wrap">{request.reviewerNote}</p>
          </div>
        ) : null}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow transition-all hover:brightness-110"
          >
            Close
          </button>
        </div>
      </div>
    </Dialog>
  );
}

function formatLeaveType(type: string): string {
  const map: Record<string, string> = {
    CASUAL: "Casual",
    SICK: "Sick",
    PAID: "Paid",
    UNPAID: "Unpaid",
  };
  return map[type] ?? type;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
  } catch {
    return dateStr;
  }
}
