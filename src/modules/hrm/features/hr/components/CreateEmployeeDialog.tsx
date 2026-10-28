import { useEffect, useMemo, useState, type FormEvent } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2 } from "lucide-react";

import { useAuth } from "@features/auth";
import { useToast } from "@shared/components/feedback";
import { DatePicker, Dialog } from "@shared/components/ui";
import { getApiErrorMessage } from "@shared/lib";

import { useDepartments, useDesignations } from "../hooks";
import { hrService } from "../services";

import { Select } from "@hrm/components/ui/select";
import { RefreshButton } from "@/components/ui/RefreshButton";

import type { Candidate, CreateEmployeeInput, EmploymentType, UserRole } from "../types";

interface CreateEmployeeDialogProps {
  candidate?: Candidate | null;
  open?: boolean | undefined;
  onClose: () => void;
  onCreated: (employeeId: number) => void;
}

const ROLES: UserRole[] = ["employee", "manager", "hr", "sub_hr"];
const HR_CREATABLE_ROLES: UserRole[] = ["employee", "sub_hr"];
const SUB_HR_CREATABLE_ROLES: UserRole[] = ["employee"];
const EMPLOYMENT_TYPES: EmploymentType[] = ["full_time", "part_time", "contract", "intern"];
const EMAIL_RE = /^\S+@\S+\.\S+$/;

type Errors = Partial<Record<keyof CreateEmployeeInput, string>>;

export function CreateEmployeeDialog({ candidate = null, open, onClose, onCreated }: CreateEmployeeDialogProps) {
  const dialogOpen = open ?? Boolean(candidate);
  const [values, setValues] = useState<CreateEmployeeInput>(() => emptyValues(candidate));
  const [errors, setErrors] = useState<Errors>({});
  const { role: creatorRole } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const departments = useDepartments(dialogOpen);
  const designations = useDesignations(dialogOpen);
  const managers = useQuery({
    queryKey: ["hr", "employees", "manager-options"],
    queryFn: hrService.listManagerEmployees,
    enabled: dialogOpen,
  });

  const departmentItems = departments.data ?? [];
  const designationItems = designations.data ?? [];
  const managerItems = managers.data ?? [];
  const creatableRoles = rolesForCreator(creatorRole);
  const filteredDesignations = values.departmentId
    ? designationItems.filter(
        (designation) =>
          designation.departmentId == null || designation.departmentId === values.departmentId,
      )
    : designationItems;

  const mutation = useMutation<number, Error, CreateEmployeeInput>({
    mutationFn: (input) => {
      if (candidate) return hrService.createEmployeeFromCandidate(candidate.id, input);
      return hrService.createEmployee(input);
    },
    onSuccess: async (employeeId) => {
      await qc.invalidateQueries({ queryKey: ["hr"] });
      toast.success("Employee created", "Send the onboarding form when ready.");
      onCreated(employeeId);
    },
    onError: (err) => {
      toast.error("Couldn't create employee", getApiErrorMessage(err));
    },
  });

  const isDirty = useMemo(
    () =>
      values.email !== (candidate?.email ?? "") ||
      values.name !== (candidate?.name ?? "") ||
      values.phone !== (candidate?.phone ?? "") ||
      values.employeeCode.length > 0 ||
      values.joiningDate.length > 0 ||
      values.departmentId > 0 ||
      Boolean(values.designationId) ||
      Boolean(values.managerId),
    [candidate, values],
  );

  useEffect(() => {
    if (!dialogOpen) return;
    setValues(emptyValues(candidate));
    setErrors({});
    mutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen, candidate?.id]);

  useEffect(() => {
    if (!values.designationId || !values.departmentId) return;
    const selectedDesignation = designationItems.find((item) => item.id === values.designationId);
    if (
      selectedDesignation?.departmentId &&
      selectedDesignation.departmentId !== values.departmentId
    ) {
      update("designationId", null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.departmentId, designationItems]);

  function update<K extends keyof CreateEmployeeInput>(key: K, value: CreateEmployeeInput[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed: CreateEmployeeInput = {
      ...values,
      email: values.email.trim(),
      name: values.name.trim(),
      phone: values.phone.trim(),
      employeeCode: values.employeeCode.trim(),
      designationId: values.designationId || null,
      managerId: values.managerId || null,
    };
    const nextErrors = validate(trimmed);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    mutation.mutate(trimmed);
  }

  function close() {
    if (mutation.isPending) return;
    if (!isDirty || window.confirm("Discard the employee form changes?")) onClose();
  }

  return (
    <Dialog
      open={dialogOpen}
      onClose={close}
      title="Create employee"
      description={candidate ? "Create the employee record first, then send the onboarding form." : "Create an employee directly, then continue onboarding setup."}
      size="lg"
      headerActions={
        <RefreshButton
          onRefresh={() => Promise.all([departments.refetch(), designations.refetch(), managers.refetch()])}
          isRefreshing={departments.isFetching || designations.isFetching || managers.isFetching}
          label="departments, designations and managers"
        />
      }
    >
      <form onSubmit={submit} noValidate>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="emp-name"
              label="Full name"
              required
              error={errors.name}
              input={
                <input
                  id="emp-name"
                  value={values.name}
                  onChange={(e) => update("name", e.target.value)}
                  className={fieldClass(errors.name)}
                  disabled={mutation.isPending}
                />
              }
            />
            <Field
              id="emp-email"
              label="Email"
              required
              error={errors.email}
              input={
                <input
                  id="emp-email"
                  type="email"
                  value={values.email}
                  onChange={(e) => update("email", e.target.value)}
                  className={fieldClass(errors.email)}
                  disabled={mutation.isPending}
                />
              }
            />
            <Field
              id="emp-phone"
              label="Phone"
              required
              error={errors.phone}
              input={
                <input
                  id="emp-phone"
                  value={values.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  className={fieldClass(errors.phone)}
                  disabled={mutation.isPending}
                />
              }
            />
            <Field
              id="emp-role"
              label="Role"
              required
              input={
                <Select
                  id="emp-role"
                  value={values.role}
                  onChange={(e) => update("role", e.target.value as UserRole)}
                  className={fieldClass()}
                  disabled={mutation.isPending}
                >
                  {creatableRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </Select>
              }
            />
            <Field
              id="emp-code"
              label="Employee code"
              required
              error={errors.employeeCode}
              input={
                <input
                  id="emp-code"
                  value={values.employeeCode}
                  onChange={(e) => update("employeeCode", e.target.value)}
                  placeholder="EMP-1042"
                  className={fieldClass(errors.employeeCode)}
                  disabled={mutation.isPending}
                />
              }
            />
            <Field
              id="emp-joining"
              label="Joining date"
              required
              error={errors.joiningDate}
              input={
                <DatePicker
                  id="emp-joining"
                  value={values.joiningDate}
                  onChange={(value) => update("joiningDate", value)}
                  required
                  ariaLabel="Choose joining date"
                  buttonClassName={fieldClass(errors.joiningDate)}
                  disabled={mutation.isPending}
                />
              }
            />
            <Field
              id="emp-type"
              label="Employment type"
              required
              input={
                <Select
                  id="emp-type"
                  value={values.employmentType}
                  onChange={(e) => update("employmentType", e.target.value as EmploymentType)}
                  className={fieldClass()}
                  disabled={mutation.isPending}
                >
                  {EMPLOYMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.replace("_", " ")}
                    </option>
                  ))}
                </Select>
              }
            />
            <Field
              id="emp-department"
              label="Department"
              required
              error={errors.departmentId}
              input={
                <Select
                  id="emp-department"
                  value={values.departmentId || ""}
                  onChange={(e) => {
                    update("departmentId", e.target.value ? Number(e.target.value) : 0);
                    update("designationId", null);
                  }}
                  className={`${fieldClass(errors.departmentId)}${refreshingClass(departments)}`}
                  disabled={mutation.isPending || departments.isLoading}
                >
                  <option value="">
                    {departments.isLoading ? "Loading departments..." : "Select department"}
                  </option>
                  {departmentItems.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </Select>
              }
            />
            <Field
              id="emp-designation"
              label="Designation"
              error={errors.designationId}
              input={
                <Select
                  id="emp-designation"
                  value={values.designationId || ""}
                  onChange={(e) =>
                    update("designationId", e.target.value ? Number(e.target.value) : null)
                  }
                  className={`${fieldClass(errors.designationId)}${refreshingClass(designations)}`}
                  disabled={mutation.isPending || designations.isLoading}
                >
                  <option value="">
                    {designations.isLoading ? "Loading designations..." : "No designation"}
                  </option>
                  {filteredDesignations.map((designation) => (
                    <option key={designation.id} value={designation.id}>
                      {designation.title}
                      {designation.departmentName ? ` - ${designation.departmentName}` : ""}
                    </option>
                  ))}
                </Select>
              }
            />
            <Field
              id="emp-manager"
              label="Manager"
              error={errors.managerId}
              input={
                <Select
                  id="emp-manager"
                  value={values.managerId || ""}
                  onChange={(e) =>
                    update("managerId", e.target.value ? Number(e.target.value) : null)
                  }
                  className={`${fieldClass(errors.managerId)}${refreshingClass(managers)}`}
                  disabled={mutation.isPending || managers.isLoading}
                >
                  <option value="">
                    {managers.isLoading ? "Loading managers..." : "No manager"}
                  </option>
                  {managerItems.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name} ({manager.employeeCode})
                    </option>
                  ))}
                </Select>
              }
            />
          </div>

          {mutation.error ? (
            <p className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{getApiErrorMessage(mutation.error)}</span>
            </p>
          ) : null}

          {departments.error ? (
            <p className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>Could not load departments: {getApiErrorMessage(departments.error)}</span>
            </p>
          ) : null}

          {designations.error ? (
            <p className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>Could not load designations: {getApiErrorMessage(designations.error)}</span>
            </p>
          ) : null}

          {managers.error ? (
            <p className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>Could not load managers: {getApiErrorMessage(managers.error)}</span>
            </p>
          ) : null}
        </div>

        <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={close}
            disabled={mutation.isPending}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            {mutation.isPending ? "Creating..." : "Create employee"}
          </button>
        </footer>
      </form>
    </Dialog>
  );
}

function emptyValues(candidate: Candidate | null): CreateEmployeeInput {
  return {
    email: candidate?.email ?? "",
    name: candidate?.name ?? "",
    phone: candidate?.phone ?? "",
    role: "employee",
    employeeCode: "",
    joiningDate: "",
    employmentType: "full_time",
    departmentId: 0,
    designationId: null,
    managerId: null,
  };
}

function rolesForCreator(creatorRole: string | null): UserRole[] {
  switch (creatorRole) {
    case "HR":
      return HR_CREATABLE_ROLES;
    case "SUB_HR":
      return SUB_HR_CREATABLE_ROLES;
    default:
      return ROLES;
  }
}

function validate(values: CreateEmployeeInput): Errors {
  const errors: Errors = {};
  if (!values.name) errors.name = "Name is required.";
  if (!values.email) errors.email = "Email is required.";
  else if (!EMAIL_RE.test(values.email)) errors.email = "Enter a valid email.";
  if (!values.phone) errors.phone = "Phone is required.";
  if (!values.employeeCode) errors.employeeCode = "Employee code is required.";
  if (!values.joiningDate) errors.joiningDate = "Joining date is required.";
  if (!values.departmentId || values.departmentId < 1)
    errors.departmentId = "Department is required.";
  if (values.designationId != null && values.designationId < 1)
    errors.designationId = "Use a valid designation.";
  if (values.managerId != null && values.managerId < 1) errors.managerId = "Use a valid manager.";
  return errors;
}

interface FieldProps {
  id: string;
  label: string;
  required?: boolean | undefined;
  error?: string | undefined;
  input: React.ReactNode;
}

function Field({ id, label, required, error, input }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </label>
      <div className="mt-1.5">{input}</div>
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

/** Dims a lookup dropdown while its options are being re-fetched in the background. */
function refreshingClass(query: { isFetching: boolean; isLoading: boolean }): string {
  return query.isFetching && !query.isLoading ? " opacity-60" : "";
}

function fieldClass(error?: string): string {
  const base =
    "w-full rounded-lg border bg-white px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-1 disabled:bg-slate-50 disabled:text-slate-400";
  const tone = error
    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500"
    : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500";
  return `${base} ${tone}`;
}
