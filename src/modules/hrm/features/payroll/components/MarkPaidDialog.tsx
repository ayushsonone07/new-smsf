import { useState, type FormEvent } from "react";

import { Loader2 } from "lucide-react";

import { useToast } from "@shared/components/feedback";
import { Dialog } from "@shared/components/ui";
import { getApiErrorMessage } from "@shared/lib";

import { Select } from "@hrm/components/ui/select";

import { useMarkPaid } from "../hooks";
import { formatMoney } from "../lib/payrollFormat";
import { PAYMENT_METHOD_LABELS } from "../types";

import type { Payroll, PaymentMethod, PayrollPaymentInput } from "../types";

const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

interface MarkPaidDialogProps {
  open: boolean;
  payroll: Payroll | null;
  onClose: () => void;
}

export function MarkPaidDialog({ open, payroll, onClose }: MarkPaidDialogProps) {
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const markPaid = useMarkPaid();
  const toast = useToast();
  const disabled = markPaid.isPending || !payroll;

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!paymentDate) errs.paymentDate = "Payment date is required.";
    if (!method) errs.method = "Select a payment method.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!payroll) return;
    if (Number(payroll.netSalary) <= 0) {
      toast.error("Cannot mark payroll as paid because net salary is zero or negative.");
      return;
    }
    if (!validate()) return;
    const input: PayrollPaymentInput = {
      paymentDate,
      paymentMethod: method,
      amount: payroll.netSalary,
      ...(reference.trim() ? { transactionReference: reference.trim() } : {}),
    };
    markPaid.mutate(
      { id: payroll.id, input },
      {
        onSuccess: () => {
          toast.success(`Payroll ${payroll.employeeCode} marked as paid.`);
          onClose();
        },
        onError: (err) => {
          toast.error(getApiErrorMessage(err, "Failed to record payment."));
        },
      },
    );
  }

  return (
    <Dialog open={open} onClose={onClose} title="Mark as Paid" size="md">
      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        {payroll ? (
          <div className="space-y-2">
            <div className="rounded-xl bg-surface-muted px-4 py-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">
                  {payroll.employeeName} ({payroll.employeeCode})
                </span>
                <span className="font-bold text-foreground">₹ {formatMoney(payroll.netSalary)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                The payment is recorded against this payroll; the amount defaults to the net salary.
              </p>
            </div>
            {Number(payroll.netSalary) <= 0 ? (
              <div className="rounded-xl border border-danger/30 bg-danger-soft/40 p-3 text-xs text-danger font-medium">
                Warning: Net salary is zero or negative (₹ {formatMoney(payroll.netSalary)}). Payroll cannot be marked as paid.
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="payment-date" className="mb-1.5 block text-sm font-semibold text-foreground">
              Payment Date <span className="text-danger">*</span>
            </label>
            <input
              id="payment-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              disabled={disabled}
              className="block w-full rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-sm text-foreground shadow transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            />
            {errors.paymentDate ? (
              <p className="mt-1 text-xs text-danger">{errors.paymentDate}</p>
            ) : null}
          </div>
          <div>
            <label htmlFor="payment-method" className="mb-1.5 block text-sm font-semibold text-foreground">
              Method <span className="text-danger">*</span>
            </label>
            <Select
              id="payment-method"
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
          </div>
        </div>

        <div>
          <label htmlFor="payment-reference" className="mb-1.5 block text-sm font-semibold text-foreground">
            Transaction Reference <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            id="payment-reference"
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            disabled={disabled}
            placeholder="e.g. UTR / cheque / cash voucher number"
            className="block w-full rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-sm text-foreground shadow transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-1">
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
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-all hover:brightness-110 disabled:opacity-60"
          >
            {markPaid.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Confirm Payment
          </button>
        </div>
      </form>
    </Dialog>
  );
}