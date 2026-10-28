import { useEffect, useMemo, useState } from "react";

import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  CheckCircle2,
  Loader2,
  Save,
  UserCog,
  X,
} from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";

import { useToast } from "@shared/components/feedback";
import { Card, DatePicker, StatusBadge } from "@shared/components/ui";
import { ROUTES } from "@shared/constants";
import { RefreshButton } from "@/components/ui/RefreshButton";
import type { EmployeeListItem } from "@features/hr";

import { useAppDispatch, useAppSelector } from "@hrm/app/store/hooks";
import {
  fetchDepartments,
  selectDepartments,
  selectDepartmentsLoading,
} from "@hrm/slices/departmentSlice";
import {
  fetchDesignations,
  selectDesignations,
  selectDesignationsLoading,
} from "@hrm/slices/designationSlice";
import {
  fetchEmployeeById,
  fetchManagerEmployees,
  selectEmployeeDetailLoading,
  selectEmployeeMutating,
  selectEmployeesError,
  selectManagerOptions,
  selectManagerOptionsLoading,
  selectSelectedEmployee,
  updateEmployee,
  updateEmployeeStatus,
} from "@hrm/slices/employeeSlice";

import { OnboardingStatusBadge } from "./OnboardingStatusBadge";

import type {
  EmployeeStatus,
  EmploymentType,
  UpdateEmployeeInput,
  UpdateEmployeeStatusInput,
  UserRole,
} from "../types";

const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: "full_time", label: "Full time" },
  { value: "part_time", label: "Part time" },
  { value: "contract", label: "Contract" },
  { value: "intern", label: "Intern" },
];

const EMPLOYEE_STATUSES: { value: EmployeeStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "on_leave", label: "On leave" },
  { value: "notice", label: "Notice" },
  { value: "terminated", label: "Terminated" },
];

const USER_ROLES: { value: UserRole; label: string }[] = [
  { value: "employee", label: "Employee" },
  { value: "manager", label: "Manager" },
  { value: "sub_hr", label: "Sub HR" },
  { value: "hr", label: "HR" },
  { value: "admin", label: "Admin" },
];

export function EmployeeProfilePage() {
  const dispatch = useAppDispatch();
  const params = useParams();
  const employeeId = Number(params.employeeId);
  const selectedEmployee = useAppSelector(selectSelectedEmployee);
  const isDetailLoading = useAppSelector(selectEmployeeDetailLoading);
  const error = useAppSelector(selectEmployeesError);

  useEffect(() => {
    if (Number.isFinite(employeeId) && employeeId > 0) {
      void dispatch(fetchEmployeeById(employeeId));
    }
  }, [dispatch, employeeId]);

  // A manual refresh keeps the current profile on screen (dimmed) instead of the skeleton,
  // so an open edit form is not thrown away while the latest record loads.
  const hasCurrentEmployee = selectedEmployee?.id === employeeId;
  const isRefreshing = isDetailLoading && hasCurrentEmployee;

  function refreshEmployee() {
    if (!Number.isFinite(employeeId) || employeeId <= 0) return undefined;
    return dispatch(fetchEmployeeById(employeeId));
  }

  return (
    <>
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Link
            to={ROUTES.employees}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={16} />
            Back to employees
          </Link>
          <RefreshButton onRefresh={refreshEmployee} isRefreshing={isDetailLoading} label="employee profile" />
        </div>

        {isDetailLoading && !hasCurrentEmployee ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : selectedEmployee ? (
          <div
            className={`space-y-5 transition-opacity ${isRefreshing ? "pointer-events-none opacity-60" : ""}`}
            aria-busy={isRefreshing}
          >
            <EmployeeProfileContent employee={selectedEmployee} />
          </div>
        ) : null}
      </div>
    </>
  );
}

function EmployeeProfileContent({ employee }: { employee: EmployeeListItem }) {
  const [editing, setEditing] = useState(false);
  const location = useLocation();

  return (
    <>
      <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{employee.employeeCode}</p>
          <h1 className="text-2xl font-semibold text-foreground">{employee.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {employee.email} | {employee.phone}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <EmployeeStatusPill status={employee.status} />
          <OnboardingStatusBadge status={employee.onboardingStatus} />
          <Link
            to={`/hrm/employees/${employee.id}/onboarding`}
            state={{ from: `${location.pathname}${location.search}`, label: "Back" }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary-soft bg-primary-soft px-3 py-2 text-sm font-medium text-primary hover:bg-primary-soft/80"
          >
            <CheckCircle2 size={15} />
            Onboarding
          </Link>
          <button
            type="button"
            onClick={() => setEditing((value) => !value)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background hover:bg-foreground/90"
          >
            {editing ? <X size={15} /> : <UserCog size={15} />}
            {editing ? "Close edit" : "Edit profile"}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_22rem]">
        <Card padding="none">
          <header className="border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold text-foreground">Employee details</h2>
          </header>
          {editing ? (
            <EmployeeEditForm employee={employee} onDone={() => setEditing(false)} />
          ) : (
            <EmployeeDetails employee={employee} />
          )}
        </Card>

        {/* Re-seed the status form when a refresh brings a different status / exit date. */}
        <StatusPanel key={`${employee.id}-${employee.status}-${employee.exitDate ?? ""}`} employee={employee} />
      </div>
    </>
  );
}

function EmployeeDetails({ employee }: { employee: EmployeeListItem }) {
  return (
    <dl className="grid grid-cols-1 gap-x-5 gap-y-4 px-5 py-5 sm:grid-cols-2">
      <Detail label="Name" value={employee.name} />
      <Detail label="Role" value={formatValue(employee.role)} />
      <Detail label="Email" value={employee.email} />
      <Detail label="Phone" value={employee.phone} />
      <Detail label="Department" value={employee.departmentName} />
      <Detail label="Designation" value={employee.designationName} optional />
      <Detail label="Manager" value={employee.managerName} optional />
      <Detail label="Employment type" value={formatValue(employee.employmentType)} />
      <Detail label="Joining date" value={formatDate(employee.joiningDate)} />
      <Detail label="Exit date" value={formatDate(employee.exitDate)} optional />
      <Detail label="Created" value={formatDateTime(employee.createdAt)} />
      <Detail label="Last updated" value={formatDateTime(employee.updatedAt)} optional />
    </dl>
  );
}

function EmployeeEditForm({
  employee,
  onDone,
}: {
  employee: EmployeeListItem;
  onDone: () => void;
}) {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const isMutating = useAppSelector(selectEmployeeMutating);
  const [values, setValues] = useState<UpdateEmployeeInput>(() => ({
    email: employee.email,
    name: employee.name,
    phone: employee.phone,
    role: employee.role,
    employeeCode: employee.employeeCode,
    joiningDate: employee.joiningDate,
    employmentType: employee.employmentType,
    departmentId: employee.departmentId ?? 0,
    designationId: employee.designationId,
    managerId: employee.managerId,
  }));

  const departments = useAppSelector(selectDepartments);
  const departmentsLoading = useAppSelector(selectDepartmentsLoading);
  const designations = useAppSelector(selectDesignations);
  const designationsLoading = useAppSelector(selectDesignationsLoading);
  const managerOptions = useAppSelector(selectManagerOptions);
  const managerOptionsLoading = useAppSelector(selectManagerOptionsLoading);

  useEffect(() => {
    if (departments.length === 0) void dispatch(fetchDepartments(undefined));
    if (designations.length === 0) void dispatch(fetchDesignations(undefined));
    if (managerOptions.length === 0) void dispatch(fetchManagerEmployees(undefined));
  }, [dispatch, departments.length, designations.length, managerOptions.length]);

  const managerItems = useMemo(
    () => managerOptions.filter((item) => item.id !== employee.id),
    [employee.id, managerOptions],
  );

  function update<K extends keyof UpdateEmployeeInput>(key: K, value: UpdateEmployeeInput[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    void dispatch(updateEmployee({ id: employee.id, input: values })).then((result) => {
      if (updateEmployee.fulfilled.match(result)) {
        onDone();
        toast.success("Employee updated");
      } else {
        toast.error("Couldn't update employee", result.payload?.message ?? "Update failed");
      }
    });
  }

  return (
    <form className="space-y-5 px-5 py-5" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          label="Employee code"
          value={values.employeeCode}
          onChange={(value) => update("employeeCode", value)}
          required
        />
        <Field
          label="Name"
          value={values.name}
          onChange={(value) => update("name", value)}
          required
        />
        <Field
          label="Email"
          type="email"
          value={values.email}
          onChange={(value) => update("email", value)}
          required
        />
        <Field
          label="Phone"
          value={values.phone}
          onChange={(value) => update("phone", value)}
          required
        />
        <Select
          label="Role"
          value={values.role}
          onChange={(value) => update("role", value as UserRole)}
          options={USER_ROLES}
        />
        <Field
          label="Joining date"
          type="date"
          value={values.joiningDate}
          onChange={(value) => update("joiningDate", value)}
          required
        />
        <Select
          label="Employment type"
          value={values.employmentType}
          onChange={(value) => update("employmentType", value as EmploymentType)}
          options={EMPLOYMENT_TYPES}
        />
        <EntitySelect
          label="Department"
          value={values.departmentId}
          loading={departmentsLoading}
          items={departments}
          getLabel={(item) => item.name}
          onChange={(value) => update("departmentId", value ?? 0)}
          required
        />
        <EntitySelect
          label="Designation"
          value={values.designationId}
          loading={designationsLoading}
          items={designations}
          getLabel={(item) => item.title}
          onChange={(value) => update("designationId", value)}
        />
        <EntitySelect
          label="Manager"
          value={values.managerId}
          loading={managerOptionsLoading}
          items={managerItems}
          getLabel={(item) => `${item.name} (${item.employeeCode})`}
          onChange={(value) => update("managerId", value)}
        />
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={onDone}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-hover"
        >
          <X size={15} />
          Cancel
        </button>
        <button
          type="submit"
          disabled={isMutating || values.departmentId <= 0}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isMutating ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Save changes
        </button>
      </div>
    </form>
  );
}

function StatusPanel({ employee }: { employee: EmployeeListItem }) {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const isMutating = useAppSelector(selectEmployeeMutating);
  const [values, setValues] = useState<UpdateEmployeeStatusInput>({
    status: employee.status,
    exitDate: employee.exitDate,
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (employee.status === "terminated") {
      toast.error("Terminated employee status cannot be changed");
      return;
    }
    if (values.status === "terminated" && !values.exitDate) {
      toast.error("Exit date is mandatory when terminating an employee");
      return;
    }
    if ((values.status === "active" || values.status === "on_leave") && values.exitDate) {
      toast.error("Exit date cannot be set for active or on-leave employees");
      return;
    }
    void dispatch(
      updateEmployeeStatus({ id: employee.id, status: values.status, exitDate: values.exitDate }),
    ).then((result) => {
      if (updateEmployeeStatus.fulfilled.match(result)) {
        toast.success("Employee status updated");
      } else {
        toast.error("Couldn't update status", result.payload?.message ?? "Update failed");
      }
    });
  }

  return (
    <Card padding="none">
      <header className="border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold text-foreground">Status</h2>
      </header>
      <form className="space-y-4 px-5 py-5" onSubmit={handleSubmit}>
        <Select
          label="Employee status"
          disabled={employee.status === "terminated"}
          value={values.status}
          onChange={(value) => {
            const newStatus = value as EmployeeStatus;
            setValues((current) => ({
              ...current,
              status: newStatus,
              exitDate: newStatus === "active" || newStatus === "on_leave" ? null : current.exitDate,
            }));
          }}
          options={EMPLOYEE_STATUSES}
        />
        <Field
          label="Exit date"
          type="date"
          required={values.status === "terminated"}
          value={values.exitDate ?? ""}
          onChange={(value) => setValues((current) => ({ ...current, exitDate: value || null }))}
        />
        <button
          type="submit"
          disabled={isMutating}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isMutating ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <CalendarDays size={15} />
          )}
          Update status
        </button>
      </form>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {label}
      {type === "date" ? (
        <DatePicker
          value={value}
          onChange={onChange}
          required={required}
          ariaLabel={`Choose ${label.toLowerCase()}`}
          className="mt-1"
          buttonClassName="rounded-lg border-slate-300 px-3 text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      ) : (
        <input
          type={type}
          value={value}
          required={required}
          onChange={(event) => onChange(event.target.value)}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm normal-case tracking-normal text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      )}
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {label}
      <div className="relative">
        <select
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="mt-1 block w-full cursor-pointer rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm normal-case tracking-normal text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary appearance-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>
    </label>
  );
}

function EntitySelect<T extends { id: number }>({
  label,
  value,
  items,
  loading,
  getLabel,
  onChange,
  required,
}: {
  label: string;
  value: number | null;
  items: T[];
  loading: boolean;
  getLabel: (item: T) => string;
  onChange: (value: number | null) => void;
  required?: boolean;
}) {
  return (
    <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {label}
      <select
        value={value ?? ""}
        required={required}
        disabled={loading}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
        className="mt-1 block w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm normal-case tracking-normal text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
      >
        <option value="">{required ? "Select" : "None"}</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {getLabel(item)}
          </option>
        ))}
      </select>
    </label>
  );
}

function Detail({
  label,
  value,
  optional,
}: {
  label: string;
  value: string | null;
  optional?: boolean;
}) {
  const missing = !value || value.trim().length === 0;
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">
        {missing ? (
          <span className={optional ? "text-muted-foreground" : "font-medium text-danger"}>
            {optional ? "Optional - empty" : "Missing"}
          </span>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function EmployeeStatusPill({ status }: { status: EmployeeStatus }) {
  const toneMap: Record<EmployeeStatus, "emerald" | "sky" | "amber" | "rose"> = {
    active: "emerald",
    on_leave: "sky",
    notice: "amber",
    terminated: "rose",
  };

  return <StatusBadge label={formatValue(status)} tone={toneMap[status]} />;
}

function LoadingState() {
  return (
    <Card className="grid min-h-[18rem] place-items-center">
      <Loader2 className="animate-spin text-muted-foreground" size={28} />
    </Card>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <Card padding="sm" className="border-danger-soft bg-danger-soft">
      <p className="text-sm text-danger">{message}</p>
    </Card>
  );
}

function formatValue(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

