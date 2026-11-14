import { useEffect, useState, type FormEvent } from "react";

import { Loader2 } from "lucide-react";

import { useToast } from "@shared/components/feedback";
import { Dialog } from "@shared/components/ui";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { getApiErrorMessage } from "@shared/lib";

import { cn } from "@hrm/lib/utils";
import type { EmploymentType, EmployeeLookupItem } from "@features/hr";

import { useSalaryStructure, useSaveSalaryStructure } from "../hooks";
import { formatMoney } from "../lib/payrollFormat";

import { EmployeeSelect } from "./EmployeeSelect";

interface SalaryStructureDialogProps {
  open: boolean;
  onClose: () => void;
  initialEmployeeId?: number | "";
}

interface ComponentField {
  key: "basicSalary" | "hra" | "specialAllowance" | "otherAllowance" | "incentive";
  label: string;
  hint?: string;
  optional?: boolean;
}

const EMPLOYMENT_TYPES: { value: "full_time" | "intern"; label: string }[] = [
  { value: "full_time", label: "Full-Time" },
  { value: "intern", label: "Intern" },
];

const FIELDS: ComponentField[] = [
  { key: "basicSalary", label: "Basic Salary", hint: "60% of Fixed Salary" },
  { key: "hra", label: "HRA", hint: "24% of Fixed Salary" },
  { key: "specialAllowance", label: "Special Allowance", hint: "10% of Fixed Salary" },
  { key: "otherAllowance", label: "Other Allowance", hint: "6% of Fixed Salary" },
  { key: "incentive", label: "Incentive", optional: true, hint: "Optional performance incentive" },
];

export function SalaryStructureDialog({
  open,
  onClose,
  initialEmployeeId = "",
}: SalaryStructureDialogProps) {
  const [employmentType, setEmploymentType] = useState<"full_time" | "intern">("full_time");
  const [employeeId, setEmployeeId] = useState<number | "">(initialEmployeeId);
  const [fixedSalary, setFixedSalary] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [pfEnabled, setPfEnabled] = useState(true);
  const [esiEnabled, setEsiEnabled] = useState(true);
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const structureQuery = useSalaryStructure(employeeId === "" ? 0 : employeeId);
  const { data: structure, isLoading } = structureQuery;
  // When a refresh returns a changed structure, the effect below re-seeds the form from it;
  // an unchanged structure keeps the same reference, so unsaved edits are not discarded.
  const structureRefreshing = structureQuery.isFetching && !isLoading;
  const save = useSaveSalaryStructure();
  const toast = useToast();

  const isFullTime = employmentType === "full_time";
  const isIntern = employmentType === "intern";

  useEffect(() => {
    if (initialEmployeeId !== "") setEmployeeId(initialEmployeeId);
  }, [initialEmployeeId, open]);

  useEffect(() => {
    if (structure) {
      if (structure.stipend != null && Number(structure.stipend) > 0) {
        setEmploymentType("intern");
      }
      setFixedSalary(
        structure.fixedSalary != null && Number(structure.fixedSalary) > 0
          ? String(structure.fixedSalary)
          : ""
      );
      setValues({
        stipend: String(structure.stipend ?? structure.fixedSalary ?? 0),
        basicSalary: String(structure.basicSalary ?? 0),
        hra: String(structure.hra ?? 0),
        specialAllowance: String(structure.specialAllowance ?? 0),
        otherAllowance: String(structure.otherAllowance ?? 0),
        incentive: structure.incentive != null && Number(structure.incentive) > 0 ? String(structure.incentive) : "",
      });
      setPfEnabled(structure.pfEnabled);
      setEsiEnabled(structure.esiEnabled);
      setEffectiveFrom(structure.effectiveFrom ?? new Date().toISOString().slice(0, 10));
    } else if (employeeId === "") {
      setFixedSalary("");
      setValues({});
    }
  }, [structure, employeeId]);

  function handleEmploymentTypeChange(type: "full_time" | "intern") {
    setEmploymentType(type);
    setEmployeeId("");
    setFixedSalary("");
    setValues({});
    setErrors({});
  }

  function handleEmployeeChange(id: number, emp?: EmployeeLookupItem) {
    setEmployeeId(id);
    if (emp?.employmentType === "intern") {
      setEmploymentType("intern");
    } else {
      setEmploymentType("full_time");
    }
  }

  function handleFixedSalaryChange(val: string) {
    setFixedSalary(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      setValues((prev) => ({
        ...prev,
        basicSalary: (num * 0.60).toFixed(2),
        hra: (num * 0.24).toFixed(2),
        specialAllowance: (num * 0.10).toFixed(2),
        otherAllowance: (num * 0.06).toFixed(2),
      }));
    }
  }

  const gross = isFullTime
    ? FIELDS.reduce((sum, field) => sum + (Number(values[field.key]) || 0), 0)
    : (Number(values.stipend) || 0) + (Number(values.incentive) || 0);

  const disabled = save.isPending || isLoading;

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (employeeId === "") errs.employeeId = "Select an employee.";

    if (isFullTime) {
      for (const field of FIELDS) {
        if (field.optional && (!values[field.key] || values[field.key].trim() === "")) {
          continue;
        }
        const num = Number(values[field.key]);
        if (!values[field.key] || Number.isNaN(num) || num < 0) {
          errs[field.key] = "Enter a valid amount (0 or more).";
        }
      }
    } else {
      const stipendNum = Number(values.stipend);
      if (!values.stipend || Number.isNaN(stipendNum) || stipendNum < 0) {
        errs.stipend = isIntern ? "Enter a valid monthly stipend." : "Enter a valid monthly amount.";
      }
      if (values.incentive && values.incentive.trim() !== "") {
        const incNum = Number(values.incentive);
        if (Number.isNaN(incNum) || incNum < 0) {
          errs.incentive = "Enter a valid incentive amount.";
        }
      }
    }

    if (!effectiveFrom) errs.effectiveFrom = "Effective date is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const payloadInput = isFullTime
      ? {
          employeeId: employeeId as number,
          fixedSalary: fixedSalary && fixedSalary.trim() !== "" ? fixedSalary : "0",
          stipend: "0",
          basicSalary: values.basicSalary ?? "0",
          hra: values.hra ?? "0",
          specialAllowance: values.specialAllowance ?? "0",
          otherAllowance: values.otherAllowance ?? "0",
          incentive: values.incentive && values.incentive.trim() !== "" ? values.incentive : "0",
          pfEnabled,
          esiEnabled,
          effectiveFrom,
        }
      : {
          employeeId: employeeId as number,
          fixedSalary: values.stipend ?? "0",
          stipend: values.stipend ?? "0",
          basicSalary: "0",
          hra: "0",
          specialAllowance: "0",
          otherAllowance: "0",
          incentive: values.incentive && values.incentive.trim() !== "" ? values.incentive : "0",
          pfEnabled: false,
          esiEnabled: false,
          effectiveFrom,
        };

    save.mutate(
      {
        employeeId: employeeId as number,
        input: payloadInput,
      },
      {
        onSuccess: () => {
          toast.success(structure ? "Salary structure updated." : "Salary structure created.");
          onClose();
        },
        onError: (err) => {
          toast.error(getApiErrorMessage(err, "Failed to save salary structure."));
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Salary Structure"
      size="md"
      headerActions={
        employeeId !== "" ? (
          <RefreshButton
            onRefresh={() => structureQuery.refetch()}
            isRefreshing={structureQuery.isFetching}
            label="salary structure"
          />
        ) : undefined
      }
    >
      <form
        onSubmit={handleSubmit}
        className={`space-y-5 p-6 transition-opacity ${structureRefreshing ? "pointer-events-none opacity-60" : ""}`}
        aria-busy={structureRefreshing}
      >
        {/* Employment Type - Single Start Line */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Employment Type <span className="text-danger">*</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-surface-muted p-1">
            {EMPLOYMENT_TYPES.map((type) => {
              const isSelected = employmentType === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleEmploymentTypeChange(type.value)}
                  disabled={disabled}
                  className={cn(
                    "rounded-lg px-2.5 py-2 text-center text-xs font-semibold transition-all",
                    isSelected
                      ? "bg-surface-elevated text-primary shadow-sm ring-1 ring-border"
                      : "text-muted-foreground hover:bg-surface-elevated/50 hover:text-foreground",
                  )}
                >
                  {type.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Employee Selection */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="structure-employee" className="block text-sm font-semibold text-foreground">
              Employee <span className="text-danger">*</span>
            </label>
            <span className="text-xs text-muted-foreground">
              Showing: <span className="font-semibold text-primary">{EMPLOYMENT_TYPES.find((t) => t.value === employmentType)?.label}</span>
            </span>
          </div>
          <EmployeeSelect
            value={employeeId}
            onChange={handleEmployeeChange}
            disabled={disabled}
            employmentType={employmentType}
            placeholder={`Select ${EMPLOYMENT_TYPES.find((t) => t.value === employmentType)?.label} employee`}
          />
          {errors.employeeId ? (
            <p className="mt-1 text-xs text-danger">{errors.employeeId}</p>
          ) : null}
          {structure && !isLoading ? (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Editing the existing structure (id {structure.id}, effective{" "}
              {structure.effectiveFrom ?? "-"}). Updating preserves historical payrolls.
            </p>
          ) : null}
        </div>

        {isLoading && employeeId !== "" ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading current structure…
          </div>
        ) : null}

        {/* Full-Time: Fixed Salary & Breakdown */}
        {isFullTime ? (
          <>
            <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="payroll-fixedSalary" className="block text-sm font-semibold text-foreground">
                  Fixed Salary (Monthly)
                </label>
                <span className="text-xs font-medium text-primary">Auto-calculates breakdown</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Entering fixed salary automatically calculates: 60% Basic, 24% HRA, 10% Special Allowance, 6% Other Allowance. You can still adjust individual fields below.
              </p>
              <div className="relative pt-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">₹</span>
                <input
                  id="payroll-fixedSalary"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={fixedSalary}
                  onChange={(e) => handleFixedSalaryChange(e.target.value)}
                  disabled={disabled}
                  placeholder="0.00"
                  className="block w-full rounded-xl border border-border bg-surface-elevated pl-8 pr-4 py-2.5 text-sm font-semibold text-foreground shadow transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {FIELDS.map((field) => (
                <div key={field.key}>
                  <label
                    htmlFor={`payroll-${field.key}`}
                    className="mb-1.5 block text-sm font-semibold text-foreground"
                  >
                    {field.label} {!field.optional ? <span className="text-danger">*</span> : <span className="text-xs font-normal text-muted-foreground ml-1">(Optional)</span>}
                  </label>
                  <input
                    id={`payroll-${field.key}`}
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={values[field.key] ?? ""}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    disabled={disabled}
                    placeholder="0.00"
                    className="block w-full rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-sm text-foreground shadow transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                  />
                  {field.hint ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">{field.hint}</p>
                  ) : null}
                  {errors[field.key] ? (
                    <p className="mt-1 text-xs text-danger">{errors[field.key]}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        ) : (
          /* Intern / Part-Time / Contract: Simple Stipend / Fixed Amount + Incentive */
          <div className="space-y-4">
            <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="payroll-stipend" className="block text-sm font-semibold text-foreground">
                  {isIntern ? "Monthly Stipend" : "Monthly Fixed Pay"} <span className="text-danger">*</span>
                </label>
                <span className="text-xs font-medium text-primary">Direct payout</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {isIntern
                  ? "Consolidated monthly internship stipend amount (no allowance breakdown)."
                  : "Consolidated monthly pay or retainer fee."}
              </p>
              <div className="relative pt-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">₹</span>
                <input
                  id="payroll-stipend"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={values.stipend ?? ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, stipend: e.target.value }))}
                  disabled={disabled}
                  placeholder="0.00"
                  className="block w-full rounded-xl border border-border bg-surface-elevated pl-8 pr-4 py-2.5 text-sm font-semibold text-foreground shadow transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                />
              </div>
              {errors.stipend ? <p className="mt-1 text-xs text-danger">{errors.stipend}</p> : null}
            </div>

            <div>
              <label htmlFor="payroll-incentive-simple" className="mb-1.5 block text-sm font-semibold text-foreground">
                Incentive <span className="text-xs font-normal text-muted-foreground ml-1">(Optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">₹</span>
                <input
                  id="payroll-incentive-simple"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={values.incentive ?? ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, incentive: e.target.value }))}
                  disabled={disabled}
                  placeholder="0.00"
                  className="block w-full rounded-xl border border-border bg-surface-elevated pl-8 pr-4 py-2.5 text-sm text-foreground shadow transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Optional performance or milestone incentive
              </p>
              {errors.incentive ? <p className="mt-1 text-xs text-danger">{errors.incentive}</p> : null}
            </div>
          </div>
        )}

        {/* Monthly Total Display */}
        <div className="rounded-xl bg-surface-muted px-4 py-3 text-sm">
          <span className="font-medium text-foreground">
            {isIntern ? "Monthly Stipend: " : "Monthly Gross: "}
          </span>
          <span className="font-bold text-foreground">₹ {formatMoney(gross.toFixed(2))}</span>
        </div>

        <div>
          <label htmlFor="structure-effective" className="mb-1.5 block text-sm font-semibold text-foreground">
            Effective From <span className="text-danger">*</span>
          </label>
          <input
            id="structure-effective"
            type="date"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
            disabled={disabled}
            className="block w-full rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-sm text-foreground shadow transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
          />
          {errors.effectiveFrom ? (
            <p className="mt-1 text-xs text-danger">{errors.effectiveFrom}</p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
          >
            Close
          </button>
          <button
            type="submit"
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-all hover:brightness-110 disabled:opacity-60"
          >
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save Structure
          </button>
        </div>
      </form>
    </Dialog>
  );
}