import { useEffect, useState, type FormEvent } from "react";

import { Loader2 } from "lucide-react";

import { useToast } from "@shared/components/feedback";
import { Dialog } from "@shared/components/ui";
import { getApiErrorMessage } from "@shared/lib";

import { useSalaryStructure, useSaveSalaryStructure } from "../hooks";
import { formatMoney } from "../lib/payrollFormat";

import { EmployeeSelect } from "./EmployeeSelect";

interface SalaryStructureDialogProps {
  open: boolean;
  onClose: () => void;
  initialEmployeeId?: number | "";
}

interface ComponentField {
  key: "basicSalary" | "hra" | "conveyanceAllowance" | "medicalAllowance" | "specialAllowance";
  label: string;
  hint?: string;
}

const FIELDS: ComponentField[] = [
  { key: "basicSalary", label: "Basic Salary", hint: "12% PF is computed on this" },
  { key: "hra", label: "HRA" },
  { key: "conveyanceAllowance", label: "Conveyance Allowance" },
  { key: "medicalAllowance", label: "Medical Allowance" },
  { key: "specialAllowance", label: "Special Allowance" },
];

export function SalaryStructureDialog({
  open,
  onClose,
  initialEmployeeId = "",
}: SalaryStructureDialogProps) {
  const [employeeId, setEmployeeId] = useState<number | "">(initialEmployeeId);
  const [values, setValues] = useState<Record<string, string>>({});
  const [pfEnabled, setPfEnabled] = useState(true);
  const [esiEnabled, setEsiEnabled] = useState(true);
  const [tdsEnabled, setTdsEnabled] = useState(true);
  const [professionalTaxEnabled, setProfessionalTaxEnabled] = useState(true);
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: structure, isLoading } = useSalaryStructure(employeeId === "" ? 0 : employeeId);
  const save = useSaveSalaryStructure();
  const toast = useToast();

  useEffect(() => {
    if (initialEmployeeId !== "") setEmployeeId(initialEmployeeId);
  }, [initialEmployeeId, open]);

  useEffect(() => {
    if (structure) {
      setValues({
        basicSalary: String(structure.basicSalary ?? 0),
        hra: String(structure.hra ?? 0),
        conveyanceAllowance: String(structure.conveyanceAllowance ?? 0),
        medicalAllowance: String(structure.medicalAllowance ?? 0),
        specialAllowance: String(structure.specialAllowance ?? 0),
      });
      setPfEnabled(structure.pfEnabled);
      setEsiEnabled(structure.esiEnabled);
      setTdsEnabled(structure.tdsEnabled);
      setProfessionalTaxEnabled(structure.professionalTaxEnabled);
      setEffectiveFrom(structure.effectiveFrom ?? new Date().toISOString().slice(0, 10));
    } else if (employeeId === "") {
      setValues({});
    }
  }, [structure, employeeId]);

  const gross = FIELDS.reduce((sum, field) => sum + (Number(values[field.key]) || 0), 0);
  const disabled = save.isPending || isLoading;

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (employeeId === "") errs.employeeId = "Select an employee.";
    for (const field of FIELDS) {
      const num = Number(values[field.key]);
      if (!values[field.key] || Number.isNaN(num) || num < 0) {
        errs[field.key] = "Enter a valid amount (0 or more).";
      }
    }
    if (!effectiveFrom) errs.effectiveFrom = "Effective date is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    save.mutate(
      {
        employeeId: employeeId as number,
        input: {
          employeeId: employeeId as number,
          basicSalary: values.basicSalary ?? "0",
          hra: values.hra ?? "0",
          conveyanceAllowance: values.conveyanceAllowance ?? "0",
          medicalAllowance: values.medicalAllowance ?? "0",
          specialAllowance: values.specialAllowance ?? "0",
          pfEnabled,
          esiEnabled,
          tdsEnabled,
          professionalTaxEnabled,
          effectiveFrom,
        },
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
    <Dialog open={open} onClose={onClose} title="Salary Structure" size="md">
      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        <div>
          <label htmlFor="structure-employee" className="mb-1.5 block text-sm font-semibold text-foreground">
            Employee <span className="text-danger">*</span>
          </label>
          <EmployeeSelect value={employeeId} onChange={setEmployeeId} disabled={disabled} />
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

        <div className="grid grid-cols-2 gap-4">
          {FIELDS.map((field) => (
            <div key={field.key}>
              <label
                htmlFor={`payroll-${field.key}`}
                className="mb-1.5 block text-sm font-semibold text-foreground"
              >
                {field.label} <span className="text-danger">*</span>
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

        <div className="rounded-xl bg-surface-muted px-4 py-3 text-sm">
          <span className="font-medium text-foreground">Monthly gross: </span>
          <span className="font-bold text-foreground">₹ {formatMoney(gross.toFixed(2))}</span>
        </div>

        {/* DISABLED: PF, ESI, TDS and Professional Tax are not applicable in the
        current company setup. Kept commented for future use.
        <div className="flex flex-wrap gap-6">
          {(
            [
              { key: "pf", label: "Provident Fund (PF)", value: pfEnabled, set: setPfEnabled },
              { key: "esi", label: "ESI", value: esiEnabled, set: setEsiEnabled },
              { key: "tds", label: "TDS", value: tdsEnabled, set: setTdsEnabled },
              {
                key: "pt",
                label: "Professional Tax",
                value: professionalTaxEnabled,
                set: setProfessionalTaxEnabled,
              },
            ] as const
          ).map((toggle) => (
            <label key={toggle.key} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={toggle.value}
                onChange={(e) => toggle.set(e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              {toggle.label}
            </label>
          ))}
        </div>
        */}

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