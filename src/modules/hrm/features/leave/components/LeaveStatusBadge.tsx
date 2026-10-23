import { StatusBadge } from "@shared/components/ui";

import type { LeaveStatus } from "../types";

const STATUS_TONE: Record<string, "amber" | "emerald" | "red" | "slate"> = {
  PENDING: "amber",
  APPROVED: "emerald",
  REJECTED: "red",
  CANCELLED: "slate",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

interface LeaveStatusBadgeProps {
  status: LeaveStatus;
  className?: string;
}

export function LeaveStatusBadge({ status, className }: LeaveStatusBadgeProps) {
  const tone = STATUS_TONE[status] ?? "slate";
  const label = STATUS_LABEL[status] ?? status;
  return <StatusBadge label={label} tone={tone} dot className={className ?? ""} />;
}

export function getLeaveStatusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status;
}

export function getLeaveStatusTone(status: string): "amber" | "emerald" | "red" | "slate" {
  return STATUS_TONE[status] ?? "slate";
}
