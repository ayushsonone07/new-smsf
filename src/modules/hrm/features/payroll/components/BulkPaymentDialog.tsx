import { useState, type FormEvent } from "react";

import { CreditCard, Loader2 } from "lucide-react";

import { useToast } from "@shared/components/feedback";
import { Dialog } from "@shared/components/ui";
import { getApiErrorMessage } from "@shared/lib";

import { Select } from "@hrm/components/ui/select";

import { useBulkPayPayroll } from "../hooks";
import { formatMoney } from "../lib/payrollFormat";
import { PAYMENT_METHOD_LABELS } from "../types";

import type { PaymentMethod, Payroll } from "../types";

const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

interface BulkPaymentDialogProps {
  open: boolean;
  selectedPayrolls: Payroll[];
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkPaymentDialog({
  open,
  selectedPayrolls,
  onClose,
  onSuccess,
}: BulkPaymentDialogProps) {
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const bulkPay = useBulkPayPayroll();
  const toast = useToast();
  const disabled = bulkPay.isPending || selectedPayrolls.length === 0;

  const totalAmount = selectedPayrolls.reduce(
    (sum, p) => sum + (Number(p.netSalary) || 0),
    0,
  );

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!paymentDate) errs.paymentDate = "Payment date is required.";
    if (!method) errs.method = "Select a payment method.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    bulkPay.mutate(
      {
        payrollIds: selectedPayrolls.map((p) => p.id),
        paymentDate,
        paymentMethod: method,
        ...(reference.trim() ? { transactionReference: reference.trim() } : {}),
      },
      {
        onSuccess: (res) => {
          toast.success(res.message || `Marked ${selectedPayrolls.length} payroll(s) as paid.`);
          onSuccess();
          onClose();
        },
        onError: (err) => {
          toast.error(getApiErrorMessage(err, "Failed to record bulk payment."));
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Mark ${selectedPayrolls.length} Payrolls as Paid`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        {/* Total Summary Banner */}
        <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Payout
              </p>
              <p className="text-lg font-bold text-foreground">
                {formatMoney(totalAmount)}
              </p>
            </div>
          </div>
          <span className="rounded-full bg-surface-elevated border border-border px-3 py-1 text-xs font-semibold text-foreground">
            {selectedPayrolls.length} Employees
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="bulk-pay-date" className="mb-1.5 block text-sm font-semibold text-foreground">
              Payment Date <span className="text-danger">*</span>
            </label>
            <input
              id="bulk-pay-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              disabled={disabled}
              className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-sm text-foreground shadow transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            />
            {errors.paymentDate ? <p className="mt-1 text-xs text-danger">{errors.paymentDate}</p> : null}
          </div>

          <div>
            <label htmlFor="bulk-pay-method" className="mb-1.5 block text-sm font-semibold text-foreground">
              Payment Method <span className="text-danger">*</span>
            </label>
            <Select
              id="bulk-pay-method"
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              disabled={disabled}
              className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-sm text-foreground shadow transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_METHOD_LABELS[m]}
                </option>
              ))}
            </Select>
            {errors.method ? <p className="mt-1 text-xs text-danger">{errors.method}</p> : null}
          </div>

          <div>
            <label htmlFor="bulk-pay-ref" className="mb-1.5 block text-sm font-semibold text-foreground">
              Transaction Reference / UTR{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              id="bulk-pay-ref"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              disabled={disabled}
              placeholder="e.g. UTR / NEFT / Cheque No."
              className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-sm text-foreground shadow placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Confirm & Pay ({selectedPayrolls.length})
          </button>
        </div>
      </form>
    </Dialog>
  );
}

