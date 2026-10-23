import { useState, type FormEvent } from "react";

import { Loader2 } from "lucide-react";

import { useToast } from "@shared/components/feedback";
import { Dialog } from "@shared/components/ui";
import { getApiErrorMessage } from "@shared/lib";

import { useApproveLeave, useRejectLeave } from "../hooks";

import type { LeaveRequest } from "../types";

interface LeaveApprovalDialogProps {
  open: boolean;
  onClose: () => void;
  request: LeaveRequest | null;
}

export function LeaveApprovalDialog({ open, onClose, request }: LeaveApprovalDialogProps) {
  const [note, setNote] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [mode, setMode] = useState<"APPROVE" | "REJECT">("APPROVE");

  const approveLeave = useApproveLeave();
  const rejectLeave = useRejectLeave();
  const toast = useToast();

  const isPending = approveLeave.isPending || rejectLeave.isPending;

  function reset() {
    setNote("");
    setRejectionReason("");
    setMode("APPROVE");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!request) return;
    if (mode === "APPROVE") {
      approveLeave.mutate(
        { id: request.id, action: "APPROVE", note },
        {
          onSuccess: () => {
            toast.success("Leave request approved.");
            reset();
            onClose();
          },
          onError: (err) => toast.error(getApiErrorMessage(err, "Failed to approve leave.")),
        },
      );
    } else {
      if (!rejectionReason.trim()) {
        toast.error("Rejection reason is required.");
        return;
      }
      rejectLeave.mutate(
        { id: request.id, action: "REJECT", rejectionReason: rejectionReason.trim() },
        {
          onSuccess: () => {
            toast.success("Leave request rejected.");
            reset();
            onClose();
          },
          onError: (err) => toast.error(getApiErrorMessage(err, "Failed to reject leave.")),
        },
      );
    }
  }

  if (!request) return null;

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Review Leave Request"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        <div className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-foreground">
          <p>
            <strong>{request.employeeName}</strong> applied for{" "}
            <strong>{request.numberOfDays}</strong> day(s) of {request.leaveType} leave (
            {request.startDate} – {request.endDate}).
          </p>
          {request.reason ? <p className="mt-2 text-muted-foreground">Reason: {request.reason}</p> : null}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setMode("APPROVE")}
            className={`cursor-pointer flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
              mode === "APPROVE"
                ? "border-success bg-success-soft text-success"
                : "border-border bg-surface-elevated text-muted-foreground hover:bg-surface-hover"
            }`}
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => setMode("REJECT")}
            className={`cursor-pointer flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
              mode === "REJECT"
                ? "border-danger bg-danger-soft text-danger"
                : "border-border bg-surface-elevated text-muted-foreground hover:bg-surface-hover"
            }`}
          >
            Reject
          </button>
        </div>

        {mode === "APPROVE" ? (
          <div>
            <label
              htmlFor="approve-note"
              className="mb-1.5 block text-sm font-semibold text-foreground"
            >
              Note (optional)
            </label>
            <textarea
              id="approve-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isPending}
              rows={2}
              placeholder="Add a note..."
              className="block w-full resize-none rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-sm text-foreground shadow transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        ) : (
          <div>
            <label
              htmlFor="rejection-reason"
              className="mb-1.5 block text-sm font-semibold text-foreground"
            >
              Rejection Reason <span className="text-danger">*</span>
            </label>
            <textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              disabled={isPending}
              rows={2}
              placeholder="Please provide a reason for rejection."
              className="block w-full resize-none rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-sm text-foreground shadow transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
          <button
            type="button"
            onClick={() => {
              reset();
              onClose();
            }}
            disabled={isPending}
            className="cursor-pointer rounded-xl border border-border bg-surface-elevated px-5 py-2.5 text-sm font-semibold text-foreground shadow transition-all hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
              mode === "APPROVE"
                ? "bg-success hover:bg-success/90"
                : "bg-danger hover:bg-danger/90"
            }`}
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : null}
            {isPending
              ? mode === "APPROVE"
                ? "Approving..."
                : "Rejecting..."
              : mode === "APPROVE"
                ? "Approve"
                : "Reject"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
