import { Loader2 } from "lucide-react";

import { Dialog, StatusBadge } from "@shared/components/ui";
import { RefreshButton } from "@/components/ui/RefreshButton";

import { usePayrollDetails } from "../hooks";
import { formatMoney, monthName } from "../lib/payrollFormat";
import {
  DEDUCTION_LABELS,
  EARNING_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYROLL_STATUS_LABELS,
} from "../types";

import type { Payroll } from "../types";

interface PayrollDetailsDialogProps {
  open: boolean;
  payroll: Payroll | null;
  onClose: () => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

export function PayrollDetailsDialog({ open, payroll, onClose }: PayrollDetailsDialogProps) {
  const payrollId = payroll?.id ?? 0;
  const detailsQuery = usePayrollDetails(payrollId);
  const { data: details, isLoading } = detailsQuery;
  const detailsRefreshing = detailsQuery.isFetching && !isLoading;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Payroll Details"
      size="lg"
      headerActions={
        payrollId > 0 ? (
          <RefreshButton
            onRefresh={() => detailsQuery.refetch()}
            isRefreshing={detailsQuery.isFetching}
            label="payroll details"
          />
        ) : undefined
      }
    >
      {!details || isLoading ? (
        <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading payroll details…
        </div>
      ) : (
        <div
          className={`max-h-[70vh] space-y-6 overflow-y-auto p-6 transition-opacity ${
            detailsRefreshing ? "pointer-events-none opacity-60" : ""
          }`}
          aria-busy={detailsRefreshing}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                {details.employeeName}{" "}
                <span className="font-normal text-muted-foreground">({details.employeeCode})</span>
              </h3>
              <p className="text-sm text-muted-foreground">
                {monthName(details.payrollMonth)} {details.payrollYear}
                {details.departmentName ? ` · ${details.departmentName}` : ""}
              </p>
            </div>
            <StatusBadge
              label={PAYROLL_STATUS_LABELS[details.status] ?? details.status}
              tone="blue"
              dot
            />
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3">
            <Row label="Working days" value={String(details.workingDays)} />
            <Row label="Present days" value={String(details.presentDays)} />
            <Row label="Paid leave" value={String(details.paidLeaveDays)} />
            <Row label="Unpaid leave" value={String(details.unpaidLeaveDays)} />
            <Row label="Half-day attendance" value={String(details.halfDayAttendance)} />
            <Row label="Gross salary" value={`₹ ${formatMoney(details.grossSalary)}`} />
            <Row label="Net salary" value={`₹ ${formatMoney(details.netSalary)}`} />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <section>
              <h4 className="mb-2 text-sm font-semibold text-foreground">Earnings</h4>
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Component</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {details.earnings.map((e) => (
                      <tr key={e.earningType}>
                        <td className="px-3 py-2 text-foreground">
                          {EARNING_LABELS[e.earningType] ?? e.earningType}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-foreground">
                          ₹ {formatMoney(e.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h4 className="mb-2 text-sm font-semibold text-foreground">Deductions</h4>
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Component</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {details.deductions.map((d) => (
                      <tr key={d.deductionType}>
                        <td className="px-3 py-2 text-foreground">
                          {DEDUCTION_LABELS[d.deductionType] ?? d.deductionType}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-foreground">
                          − ₹ {formatMoney(d.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {details.payments.length > 0 ? (
            <section>
              <h4 className="mb-2 text-sm font-semibold text-foreground">Payment</h4>
              <div className="space-y-1.5 rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm">
                {details.payments.map((p) => (
                  <Row
                    key={p.id}
                    label={`${PAYMENT_METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod} · ${p.paymentDate ?? "-"}`}
                    value={`₹ ${formatMoney(p.amount)}${p.transactionReference ? ` (${p.transactionReference})` : ""}`}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </Dialog>
  );
}
