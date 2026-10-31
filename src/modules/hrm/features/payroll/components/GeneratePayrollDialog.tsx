import { useState, type FormEvent } from "react";

import { AlertTriangle, CheckCircle2, Loader2, UserX } from "lucide-react";

import { useToast } from "@shared/components/feedback";
import { Dialog } from "@shared/components/ui";
import { getApiErrorMessage } from "@shared/lib";

import { useGeneratePayroll } from "../hooks";
import { toYearMonth } from "../lib/payrollFormat";
import type { GeneratePayrollBatchResult } from "../types";

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
  const [summaryResult, setSummaryResult] = useState<GeneratePayrollBatchResult | null>(null);

  const generate = useGeneratePayroll();
  const toast = useToast();
  const disabled = generate.isPending;

  function handleClose() {
    setSummaryResult(null);
    onClose();
  }

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
        onSuccess: (result) => {
          if (result.skippedCount > 0) {
            setSummaryResult(result);
            toast.success(
              `Generated ${result.generatedCount} payroll record${result.generatedCount === 1 ? "" : "s"} (${result.skippedCount} skipped).`,
            );
          } else {
            toast.success(
              `Generated ${result.generatedCount} payroll record${result.generatedCount === 1 ? "" : "s"} for ${month}/${year}.`,
            );
            handleClose();
          }
        },
        onError: (err) => {
          toast.error(getApiErrorMessage(err, "Failed to generate payroll."));
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={summaryResult ? `Payroll Generation Summary (${month}/${year})` : "Generate Payroll"}
      size={summaryResult ? "lg" : "md"}
    >
      {summaryResult ? (
        <div className="space-y-5 p-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Generated
                </p>
                <p className="text-xl font-bold text-foreground">
                  {summaryResult.generatedCount} <span className="text-xs font-normal text-muted-foreground">records</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Skipped
                </p>
                <p className="text-xl font-bold text-foreground">
                  {summaryResult.skippedCount} <span className="text-xs font-normal text-muted-foreground">employees</span>
                </p>
              </div>
            </div>
          </div>

          {/* Skipped list */}
          <div className="rounded-xl border border-border bg-surface-elevated overflow-hidden shadow-sm">
            <div className="border-b border-border bg-muted/40 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <UserX className="h-4 w-4 text-amber-500" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Skipped Employees ({summaryResult.skippedEmployees.length})
                </h4>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-border/60">
              {summaryResult.skippedEmployees.map((emp) => (
                <div key={emp.employeeId} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {emp.employeeName?.slice(0, 2).toUpperCase() || "EM"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {emp.employeeName}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">{emp.employeeCode}</span>
                        {emp.departmentName && emp.departmentName !== "-" && (
                          <>
                            <span>•</span>
                            <span>{emp.departmentName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                    emp.reason.toLowerCase().includes("structure")
                      ? "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      : "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  }`}>
                    {emp.reason}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action button */}
          <div className="flex items-center justify-end pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-all hover:brightness-110"
            >
              Close & View Payrolls
            </button>
          </div>
        </div>
      ) : (
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
              onClick={handleClose}
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
      )}
    </Dialog>
  );
}
