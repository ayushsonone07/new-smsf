import { useState, type FormEvent } from "react";

import { Loader2 } from "lucide-react";

import { useToast } from "@shared/components/feedback";
import { Dialog } from "@shared/components/ui";
import { getApiErrorMessage } from "@shared/lib";

import { useGeneratePayroll } from "../hooks";
import { toYearMonth } from "../lib/payrollFormat";

import { Select } from "@hrm/components/ui/select";

import { EmployeeSelect } from "./EmployeeSelect";

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Date(2000, i, 1).toLocaleString("en-US", { month: "long" }),
}));

const THIS_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 4 }, (_, i) => String(THIS_YEAR - i));

interface GeneratePayrollDialogProps {
  open: boolean;
  onClose: () => void;
}

export function GeneratePayrollDialog({ open, onClose }: GeneratePayrollDialogProps) {
  const initial = toYearMonth(new Date());
  const [month, setMonth] = useState<number>(initial.month);
  const [year, setYear] = useState<number>(initial.year);
  const [employeeId, setEmployeeId] = useState<number | "">("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const generate = useGeneratePayroll();
  const toast = useToast();
  const disabled = generate.isPending;

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (month < 1 || month > 12) errs.month = "Select a valid month.";
    if (!year || year < 2000) errs.year = "Select a valid year.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    generate.mutate(
      { month, year, employeeId: employeeId === "" ? null : employeeId },
      {
        onSuccess: (payrolls) => {
          toast.success(
            `Generated ${payrolls.length} payroll record${payrolls.length === 1 ? "" : "s"} for ${month}/${year}.`,
          );
          onClose();
        },
        onError: (err) => {
          toast.error(getApiErrorMessage(err, "Failed to generate payroll."));
        },
      },
    );
  }

  return (
    <Dialog open={open} onClose={onClose} title="Generate Payroll" size="md">
      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="payroll-month" className="mb-1.5 block text-sm font-semibold text-foreground">
              Month <span className="text-danger">*</span>
            </label>
            <Select
              id="payroll-month"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              disabled={disabled}
              className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-sm text-foreground shadow transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
            {errors.month ? <p className="mt-1 text-xs text-danger">{errors.month}</p> : null}
          </div>
          <div>
            <label htmlFor="payroll-year" className="mb-1.5 block text-sm font-semibold text-foreground">
              Year <span className="text-danger">*</span>
            </label>
            <Select
              id="payroll-year"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              disabled={disabled}
              className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-sm text-foreground shadow transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
            {errors.year ? <p className="mt-1 text-xs text-danger">{errors.year}</p> : null}
          </div>
        </div>

        <div>
          <label htmlFor="payroll-employee" className="mb-1.5 block text-sm font-semibold text-foreground">
            Employee <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <EmployeeSelect
            value={employeeId}
            onChange={setEmployeeId}
            disabled={disabled}
            placeholder="All active employees"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Leave empty to generate for every active employee with a salary structure.
          </p>
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
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Generate Payroll
          </button>
        </div>
      </form>
    </Dialog>
  );
}