import { StatusBadge } from "@shared/components/ui";

import { PAYROLL_STATUS_LABELS } from "../types";

import type { PayrollStatus } from "../types";

const STATUS_TONES: Record<PayrollStatus, "slate" | "blue" | "emerald" | "amber" | "red" | "violet"> = {
  DRAFT: "slate",
  CALCULATED: "blue",
  APPROVED: "amber",
  PROCESSED: "violet",
  PAID: "emerald",
  CANCELLED: "red",
};

export function PayrollStatusBadge({ status }: { status: PayrollStatus }) {
  return (
    <StatusBadge
      label={PAYROLL_STATUS_LABELS[status] ?? status}
      tone={STATUS_TONES[status]}
      dot
    />
  );
}