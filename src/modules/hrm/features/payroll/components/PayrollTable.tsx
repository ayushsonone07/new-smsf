import { type ReactNode } from "react";

import { CheckCircle2, Download, Eye, Loader2, RotateCcw, Wallet, XCircle } from "lucide-react";

import { Skeleton } from "@shared/components/ui";

import { formatMoney, periodShort } from "../lib/payrollFormat";

import { PayrollStatusBadge } from "./PayrollStatusBadge";

import type { Payroll, PayrollStatus } from "../types";

interface PayrollTableProps {
  payrolls?: Payroll[] | undefined;
  loading?: boolean;
  selectedIds?: number[];
  onToggleSelect?: (id: number) => void;
  onToggleSelectAll?: () => void;
  /** Optional overlay of actions rendered per row. */
  renderActions?: (payroll: Payroll) => ReactNode;
  onDetails?: (payroll: Payroll) => void;
  emptyMessage?: string;
}

export function PayrollTable({
  payrolls,
  loading = false,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
  renderActions,
  onDetails,
  emptyMessage = "No payroll records found.",
}: PayrollTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );
  }

  if (!payrolls || payrolls.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/60 px-6 py-12 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const allSelected = payrolls.length > 0 && selectedIds.length === payrolls.length;

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            {onToggleSelect && (
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                  aria-label="Select all payrolls"
                />
              </th>
            )}
            <th className="px-4 py-3 font-medium">Employee</th>
            <th className="px-4 py-3 font-medium">Period</th>
            <th className="px-4 py-3 text-right font-medium">Gross</th>
            <th className="px-4 py-3 text-right font-medium">Deductions</th>
            <th className="px-4 py-3 text-right font-medium">Net</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {payrolls.map((payroll) => {
            const isSelected = selectedIds.includes(payroll.id);
            const isZeroSalary = Number(payroll.netSalary) <= 0;

            return (
              <tr
                key={payroll.id}
                className={`transition-colors hover:bg-muted/30 ${
                  isSelected ? "bg-primary/5" : ""
                }`}
              >
                {onToggleSelect && (
                  <td className="w-10 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(payroll.id)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                      aria-label={`Select ${payroll.employeeName}`}
                    />
                  </td>
                )}
                <td className="px-4 py-3">
                  <p className="font-semibold text-foreground">{payroll.employeeName}</p>
                  <p className="text-xs text-muted-foreground">{payroll.employeeCode}</p>
                </td>
                <td className="px-4 py-3 text-foreground">
                  {periodShort(payroll.payrollMonth, payroll.payrollYear)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-foreground">
                  {formatMoney(payroll.grossSalary)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-foreground">
                  {formatMoney(payroll.totalDeductions)}
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                  {formatMoney(payroll.netSalary)}
                  {isZeroSalary && (
                    <span className="ml-1.5 inline-flex items-center rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                      ₹0 Pay
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <PayrollStatusBadge status={payroll.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {renderActions?.(payroll)}
                    {onDetails ? (
                      <button
                        type="button"
                        onClick={() => onDetails(payroll)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg p-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label={`View details of ${payroll.employeeName}`}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="hidden md:inline">View</span>
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Default management actions guarded by the allowed status transitions. */
export function payrollActionButtons(
  payroll: Payroll,
  callbacks: {
    onApprove: (p: Payroll) => void;
    onProcess: (p: Payroll) => void;
    onMarkPaid: (p: Payroll) => void;
    onCancel: (p: Payroll) => void;
  },
): ReactNode {
  const actions: {
    key: string;
    label: string;
    icon: ReactNode;
    show: (status: PayrollStatus) => boolean;
    onClick: () => void;
    danger?: boolean;
  }[] = [
    {
      key: "approve",
      label: "Approve",
      icon: <CheckCircle2 className="h-4 w-4" />,
      show: (s) => s === "CALCULATED",
      onClick: () => callbacks.onApprove(payroll),
    },
    {
      key: "process",
      label: "Process",
      icon: <RotateCcw className="h-4 w-4" />,
      show: (s) => s === "APPROVED",
      onClick: () => callbacks.onProcess(payroll),
    },
    {
      key: "markPaid",
      label: "Pay",
      icon: <Wallet className="h-4 w-4" />,
      show: (s) => s === "PROCESSED",
      onClick: () => callbacks.onMarkPaid(payroll),
    },
    {
      key: "cancel",
      label: "Cancel",
      icon: <XCircle className="h-4 w-4" />,
      show: (s) => s === "DRAFT" || s === "CALCULATED" || s === "APPROVED",
      onClick: () => callbacks.onCancel(payroll),
      danger: true,
    },
  ];

  return (
    <>
      {actions
        .filter((action) => action.show(payroll.status))
        .map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={action.onClick}
            className={`inline-flex cursor-pointer items-center gap-1 rounded-lg p-2 text-xs font-medium transition-colors ${
              action.danger
                ? "text-danger hover:bg-danger/10"
                : "text-primary hover:bg-primary/10"
            }`}
            aria-label={`${action.label} ${payroll.employeeName}`}
          >
            {action.icon}
            <span className="hidden md:inline">{action.label}</span>
          </button>
        ))}
    </>
  );
}

export function PayslipDownloadButton({
  onDownload,
  downloading,
}: {
  onDownload: () => void;
  downloading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onDownload}
      disabled={downloading}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow transition-all hover:brightness-110 disabled:opacity-60"
    >
      {downloading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      PDF
    </button>
  );
}
