import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  Building2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

import { useAppDispatch, useAppSelector } from "@app/store";

import { useToast } from "@shared/components/feedback";
import {
  CardSkeleton,
  Dialog,
  EmptyState,
  ErrorDisplay,
  PageHeader,
} from "@shared/components/ui";
import { getApiErrorMessage } from "@shared/lib";

import { Select } from "@hrm/components/ui/select";

import {
  createDepartment as createDepartmentThunk,
  deleteDepartment as deleteDepartmentThunk,
  fetchDepartments,
  selectDepartments,
  selectDepartmentsError,
  selectDepartmentsLoading,
  updateDepartment as updateDepartmentThunk,
} from "@hrm/slices/departmentSlice";

import { hrService } from "../services";

import type {
  Department,
  DepartmentInput,
  DepartmentManager,
  EmployeeListItem,
} from "../types";

type DialogState = "none" | "create" | "update" | "delete";

const EMPTY_DEPARTMENT: DepartmentInput = {
  name: "",
  managerId: null,
};

const DEPT_TONES = [
  { chip: "bg-blue-soft text-blue-ink", accent: "bg-blue" },
  { chip: "bg-green-soft text-green-ink", accent: "bg-green" },
  { chip: "bg-amber-soft text-amber-ink", accent: "bg-amber" },
  { chip: "bg-rose-soft text-rose-ink", accent: "bg-rose" },
  { chip: "bg-orange-soft text-orange-ink", accent: "bg-orange" },
] as const;

type DeptTone = (typeof DEPT_TONES)[number];

const DEPT_TONE_BY_NAME: Record<string, DeptTone> = {
  tech: DEPT_TONES[0],
  google: DEPT_TONES[1],
  automation: DEPT_TONES[2],
  onboarding: DEPT_TONES[3],
  test: DEPT_TONES[4],
};

function deptToneFor(name: string): DeptTone | undefined {
  return DEPT_TONE_BY_NAME[name.trim().toLowerCase()];
}

export function DepartmentsPage() {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const departments = useAppSelector(selectDepartments);
  const isLoading = useAppSelector(selectDepartmentsLoading);
  const error = useAppSelector(selectDepartmentsError);

  const employees = useQuery({
    queryKey: ["hr", "employees", "department-metrics"],
    queryFn: () => hrService.listEmployees({ page: 0, size: 100, sort: "employeeCode,asc" }),
  });

  useEffect(() => {
    void dispatch(fetchDepartments(undefined));
  }, [dispatch]);

  const items = departments ?? [];
  const employeeItems = employees.data?.items ?? [];
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dialog, setDialog] = useState<DialogState>("none");
  const [query, setQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const managers = useQuery({
    queryKey: ["hr", "departments", "managers"],
    queryFn: () => hrService.listManagers(),
    enabled: dialog === "create" || dialog === "update",
  });

  const selectedDepartment = useMemo(
    () => items.find((department) => department.id === selectedId) ?? null,
    [items, selectedId],
  );

  const memberCounts = useMemo(
    () => countByDepartment(employeeItems, items),
    [employeeItems, items],
  );
  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((department) =>
      [department.name, department.parentDepartmentName ?? "", department.id.toString()].some(
        (value) => value.toLowerCase().includes(needle),
      ),
    );
  }, [items, query]);

  const totalMembers = employeeItems.filter((employee) => employee.departmentId != null).length;
  const avgTeamSize = items.length ? Math.round(totalMembers / items.length) : 0;

  useEffect(() => {
    if (selectedId && !items.some((department) => department.id === selectedId)) {
      setSelectedId(null);
    }
  }, [items, selectedId]);

  async function refreshDepartments() {
    setIsRefreshing(true);
    try {
      // Member counts / team sizes come from the employees query, so reload it with the list.
      await Promise.all([dispatch(fetchDepartments({ force: true })).unwrap(), employees.refetch()]);
      toast.success("Departments refreshed", "The latest departments were loaded.");
    } catch (err) {
      toast.error("Couldn't refresh departments", getApiErrorMessage(err));
    } finally {
      setIsRefreshing(false);
    }
  }

  function openUpdate(department: Department) {
    setSelectedId(department.id);
    setDialog("update");
  }

  function openDelete(department: Department) {
    setSelectedId(department.id);
    setDialog("delete");
  }

  return (
    <div className="w-full lg:pl-4">
      <PageHeader
        eyebrow="Organization"
        title="Departments"
        description="Manage your organization's department structure."
        className="mb-8"
        actions={
  <div className="flex w-full items-center justify-between gap-3">
    <SearchBox
      value={query}
      placeholder="Search departments..."
      onChange={setQuery}
    />

    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={() => setDialog("create")}
        className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-orange px-5 text-sm font-semibold text-white shadow transition hover:bg-orange-ink"
      >
        <Plus size={16} />
        <span className="hidden sm:inline">Add Department</span>
        <span className="sm:hidden">Add</span>
      </button>

      <button
        type="button"
        onClick={() => void refreshDepartments()}
        disabled={isRefreshing}
        aria-label="Refresh departments"
        title="Refresh departments"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-line bg-white text-ink-soft shadow transition hover:bg-orange-soft hover:text-orange-ink disabled:opacity-70"
      >
        <RefreshCw
          size={18}
          className={isRefreshing ? "animate-spin" : undefined}
        />
      </button>
    </div>
  </div>
}
      />

      <div className="mb-6 mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-ink-faint">
          {items.length} departments · {totalMembers} members · avg team size {avgTeamSize}
        </p>
        
          
          <p className="hidden shrink-0 text-xs font-medium text-ink-faint sm:block">
            Showing {filteredItems.length} of {items.length}
          </p>
        
      </div>

      {error ? (
        <ErrorDisplay
          message={`Failed to load departments: ${error}`}
        />
      ) : isLoading ? (
        <CardSkeleton count={3} />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={query ? "No departments match" : "No departments yet"}
          description={
            query
              ? "Try another department name or clear the search."
              : "Create the first department to use it in HR workflows."
          }
          action={
            <button
              type="button"
              onClick={() => setDialog("create")}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-primary/90"
            >
              <Plus size={14} />
              Create department
            </button>
          }
        />
      ) : (
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {filteredItems.map((department, index) => (
            <div
              key={department.id}
              className="mbg-anim-fade-up"
              style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
            >
              <DepartmentCard
                department={department}
                tone={deptToneFor(department.name) ?? DEPT_TONES[index % DEPT_TONES.length] ?? DEPT_TONES[0]}
                members={memberCounts.get(department.id) ?? 0}
                onEdit={() => openUpdate(department)}
                onDelete={() => openDelete(department)}
              />
            </div>
          ))}
        </section>
      )}

      <DepartmentFormDialog
        mode="create"
        open={dialog === "create"}
        managers={managers}
        onClose={() => setDialog("none")}
      />
      <DepartmentFormDialog
        mode="update"
        open={dialog === "update"}
        department={selectedDepartment}
        managers={managers}
        onClose={() => setDialog("none")}
      />
      <DeleteDepartmentDialog
        open={dialog === "delete"}
        department={selectedDepartment}
        onClose={() => setDialog("none")}
        onDeleted={() => setSelectedId(null)}
      />
    </div>
  );
}

function DepartmentCard({
  department,
  tone,
  members,
  onEdit,
  onDelete,
}: {
  department: Department;
  tone: DeptTone;
  members: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="mbg-card flex h-full flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <span className={`mbg-icon-chip h-10 w-10 rounded-xl ${tone.chip}`}>
          <Building2 size={18} />
        </span>
      </div>

      <div className="mt-3 min-w-0">
        <h2 className="truncate text-[15px] font-bold text-ink">{titleCase(department.name)}</h2>
        <p className="mt-0.5 truncate text-xs text-ink-faint">
          {departmentCode(department)} · Head: {department.managerName ?? "Unassigned"}
        </p>
      </div>

      <div className="mt-4 border-t border-line pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
          Members
        </p>
        <p className="tabular-nums mt-1 text-lg font-semibold leading-none text-ink">
          <CountUp value={members} />
        </p>
      </div>

      <div className="mt-auto flex items-center justify-end gap-1.5 pt-2">
        <IconButton label="Edit department" onClick={onEdit}>
          <Pencil size={13} />
        </IconButton>
        <IconButton label="Delete department" onClick={onDelete} danger>
          <Trash2 size={13} />
        </IconButton>
      </div>
    </article>
  );
}

function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const duration = 800;
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduceMotion]);

  return <>{display.toLocaleString()}</>;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(media.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function SearchBox({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative block w-full sm:max-w-xl">
      <Search
        size={16}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
      />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-[10px] border border-line bg-white pl-10 pr-4 text-sm text-ink shadow outline-none transition-colors placeholder:text-ink-faint focus:border-orange focus:ring-2 focus:ring-orange/20"
      />
    </label>
  );
}

function IconButton({
  label,
  children,
  onClick,
  danger,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`mbg-icon-chip h-8 w-8 border transition-colors ${
        danger
          ? "border-rose-soft text-rose-ink hover:bg-rose-soft"
          : "border-line text-ink-faint hover:bg-orange-soft hover:text-orange-ink hover:border-orange-soft"
      }`}
    >
      {children}
    </button>
  );
}

function DepartmentFormDialog({
  mode,
  open,
  department,
  managers,
  onClose,
}: {
  mode: "create" | "update";
  open: boolean;
  department?: Department | null;
  managers: UseQueryResult<DepartmentManager[], Error>;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const [values, setValues] = useState<DepartmentInput>(EMPTY_DEPARTMENT);
  const [nameError, setNameError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const managerTouched = useRef(false);
  const toast = useToast();
  const isUpdate = mode === "update";
  const managerList = managers.data ?? [];
  const managersLoading = managers.isLoading || managers.isFetching;
  const currentManager =
    managers.data?.find((manager) => manager.email === department?.managerEmail) ?? null;

  useEffect(() => {
    if (!open) return;
    managerTouched.current = false;
    setNameError(null);
    setPending(false);
    setValues(
      isUpdate && department
        ? {
            name: department.name,
            managerId: null,
          }
        : EMPTY_DEPARTMENT,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isUpdate, department?.id]);

  useEffect(() => {
    if (!open || !isUpdate || !department || managerTouched.current) return;
    if (!managersLoading && currentManager) {
      update("managerId", currentManager.userId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isUpdate, managersLoading, currentManager]);

  function update<K extends keyof DepartmentInput>(key: K, value: DepartmentInput[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (key === "name") setNameError(null);
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input: DepartmentInput = {
      name: values.name.trim(),
      managerId: values.managerId ?? null,
    };

    if (!input.name) {
      setNameError("Department name is required.");
      return;
    }

    setPending(true);

    try {
      if (isUpdate) {
        if (!department) return;
        const updated = await dispatch(
          updateDepartmentThunk({ id: department.id, input }),
        ).unwrap();
        toast.success("Department updated", `${updated.name} was saved.`);
        onClose();
      } else {
        const created = await dispatch(createDepartmentThunk(input)).unwrap();
        toast.success("Department created", `${created.name} is now available.`);
        onClose();
      }
    } catch (err) {
      const msg = getApiErrorMessage(err, `Couldn't ${isUpdate ? "update" : "create"} department`);
      toast.error(`Couldn't ${isUpdate ? "update" : "create"} department`, msg);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!pending) onClose();
      }}
      title={isUpdate ? "Update department" : "Create department"}
      size="md"
    >
      <form onSubmit={(e) => { void submit(e); }} noValidate>
        <div className="space-y-4 px-6 py-5">
          <Field
            id={`${mode}-department-name`}
            label="Department name"
            required
            error={nameError ?? undefined}
          >
            <input
              id={`${mode}-department-name`}
              type="text"
              value={values.name}
              onChange={(e) => update("name", e.target.value)}
              disabled={pending}
              className={fieldClass(Boolean(nameError))}
              placeholder="Engineering"
            />
          </Field>

          <Field
            id={`${mode}-select-manager`}
            label="Select Manager"
          >
            <div className="flex items-start gap-2">
              <div className="relative min-w-0 flex-1">
                <Select
                  id={`${mode}-select-manager`}
                  value={values.managerId ?? ""}
                  onChange={(e) => {
                    managerTouched.current = true;
                    update("managerId", e.target.value ? Number(e.target.value) : null);
                  }}
                  disabled={pending || managersLoading}
                  className={fieldClass(false)}
                >
                  <option value="">
                    {managersLoading
                      ? "Loading managers..."
                      : managerList.length === 0
                        ? "No managers available"
                        : "Select a manager"}
                  </option>
                  {managerList.map((manager) => (
                    <option key={manager.userId} value={manager.userId}>
                      {manager.userName} ({manager.email})
                    </option>
                  ))}
                </Select>
              </div>
              <button
                type="button"
                onClick={() => void managers.refetch()}
                disabled={pending || managersLoading}
                aria-label={managersLoading ? "Refreshing managers" : "Refresh managers"}
                title="Refresh managers"
                className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg border border-border text-muted-foreground shadow transition-colors hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={15} className={managers.isFetching ? "animate-spin" : undefined} />
              </button>
            </div>
          </Field>
        </div>

        <DialogFooter
          pending={pending}
          actionLabel={isUpdate ? "Update" : "Create"}
          onCancel={onClose}
        />
      </form>
    </Dialog>
  );
}

function DeleteDepartmentDialog({
  open,
  department,
  onClose,
  onDeleted,
}: {
  open: boolean;
  department: Department | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const dispatch = useAppDispatch();
  const [pending, setPending] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (open) setPending(false);
  }, [open, department?.id]);

  async function handleDelete() {
    if (!department) return;
    setPending(true);
    try {
      const message = await dispatch(deleteDepartmentThunk(department.id)).unwrap();
      toast.success("Department deleted", message || `${department.name} was deleted.`);
      onDeleted();
      onClose();
    } catch (err) {
      toast.error("Couldn't delete department", getApiErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <DeleteConfirmDialog
      open={open}
      title="Delete department"
      name={department?.name}
      pending={pending}
      disabled={!department}
      onClose={onClose}
      onConfirm={() => { void handleDelete(); }}
    />
  );
}

function DeleteConfirmDialog({
  open,
  title,
  name,
  pending,
  disabled,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  name?: string | undefined;
  pending: boolean;
  disabled: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title} size="sm">
      <div className="px-6 py-5">
        <p className="text-sm text-foreground">
          Delete <span className="font-semibold text-foreground">{name}</span>?
        </p>
        <p className="mt-1 text-xs text-muted-foreground">This removes it from active department lists.</p>
      </div>
      <footer className="flex justify-end gap-2 border-t border-line bg-[#F7F7FA] px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="rounded-[10px] border border-line bg-white px-4 py-2 text-sm font-medium text-ink-soft hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={disabled || pending}
          className="inline-flex items-center gap-2 rounded-[10px] bg-rose px-4 py-2 text-sm font-semibold text-white shadow hover:bg-rose-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : null}
          Delete
        </button>
      </footer>
    </Dialog>
  );
}

function DialogFooter({
  pending,
  actionLabel,
  onCancel,
}: {
  pending: boolean;
  actionLabel: string;
  onCancel: () => void;
}) {
  return (
    <footer className="flex justify-end gap-2 border-t border-line bg-[#F7F7FA] px-6 py-4">
      <button
        type="button"
        onClick={onCancel}
        disabled={pending}
        className="rounded-[10px] border border-line bg-white px-4 py-2 text-sm font-medium text-ink-soft hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-[10px] bg-orange px-4 py-2 text-sm font-semibold text-white shadow hover:bg-orange-ink disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : null}
        {actionLabel}
      </button>
    </footer>
  );
}

function Field({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
        {required ? <span className="ml-0.5 text-danger">*</span> : null}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}

function countByDepartment(
  employees: EmployeeListItem[],
  departments: Department[],
): Map<number, number> {
  const counts = new Map<number, number>();
  const activeIds = new Set(departments.map((department) => department.id));
  const departmentIdByName = new Map(
    departments.map((department) => [normalizeDepartmentName(department.name), department.id]),
  );

  for (const employee of employees) {
    let departmentId = employee.departmentId;
    if (departmentId == null || !activeIds.has(departmentId)) {
      departmentId =
        departmentIdByName.get(normalizeDepartmentName(employee.departmentName ?? "")) ?? null;
    }
    if (departmentId == null) continue;
    counts.set(departmentId, (counts.get(departmentId) ?? 0) + 1);
  }
  return counts;
}

function normalizeDepartmentName(name: string): string {
  return name.trim().toLowerCase();
}

function departmentCode(department: Department): string {
  const prefix =
    department.name
      .trim()
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 3)
      .toUpperCase() || "DEP";
  return `${prefix}-${String(department.id).padStart(3, "0")}`;
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function fieldClass(error: boolean): string {
  const base =
    "w-full rounded-[10px] border bg-white px-3 py-2 text-sm text-ink transition-colors focus:outline-none focus:ring-2 disabled:bg-surface-muted disabled:text-ink-faint";
  const tone = error
    ? "border-rose-soft focus:border-rose focus:ring-rose/20"
    : "border-line focus:border-orange focus:ring-orange/20";
  return `${base} ${tone}`;
}
