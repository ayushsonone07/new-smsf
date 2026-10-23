import { useEffect, useMemo, useState, type FormEvent } from "react";

import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  Building2,
  Layers3,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from "lucide-react";

import { useAppDispatch, useAppSelector } from "@app/store";

import { useToast } from "@shared/components/feedback";
import {
  AnimatedNumber,
  Card,
  CardSkeleton,
  Dialog,
  EmptyState,
  ErrorDisplay,
  PageHeader,
  StatusBadge,
} from "@shared/components/ui";
import { getApiErrorMessage } from "@shared/lib";

import { Select } from "@hrm/components/ui/select";

import {
  createDesignation as createDesignationThunk,
  deleteDesignation as deleteDesignationThunk,
  fetchDesignations,
  selectDesignations,
  selectDesignationsError,
  selectDesignationsLoading,
  updateDesignation as updateDesignationThunk,
} from "@hrm/slices/designationSlice";

import { useDepartments } from "../hooks";
import { hrService } from "../services";

import type { Department, Designation, DesignationInput, EmployeeListItem } from "../types";

type DialogState = "none" | "create" | "update" | "delete";
type DesignationLevel = "Entry" | "Mid" | "Senior";

const EMPTY_DESIGNATION: DesignationInput = {
  title: "",
  departmentId: null,
};

const ROW_TONES = [
  "bg-primary text-white",
  "bg-success text-white",
  "bg-warning text-white",
  "bg-danger text-white",
] as const;

export function DesignationsPage() {
  const dispatch = useAppDispatch();
  const toast = useToast();

  const designations = useAppSelector(selectDesignations);
  const isLoading = useAppSelector(selectDesignationsLoading);
  const error = useAppSelector(selectDesignationsError);

  const departments = useDepartments();
  const employees = useQuery({
    queryKey: ["hr", "employees", "designation-metrics"],
    queryFn: () => hrService.listEmployees({ page: 0, size: 100, sort: "employeeCode,asc" }),
  });

  useEffect(() => {
    void dispatch(fetchDesignations(undefined));
  }, [dispatch]);

  const items = designations ?? [];
  const departmentItems = departments.data ?? [];
  const employeeItems = employees.data?.items ?? [];
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dialog, setDialog] = useState<DialogState>("none");
  const [query, setQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const selectedDesignation = useMemo(
    () => items.find((designation) => designation.id === selectedId) ?? null,
    [items, selectedId],
  );

  const peopleCounts = useMemo(() => countByDesignation(employeeItems), [employeeItems]);
  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((designation) =>
      [designation.title, designation.departmentName ?? "", designation.id.toString()].some(
        (value) => value.toLowerCase().includes(needle),
      ),
    );
  }, [items, query]);

  const peopleAssigned = employeeItems.filter((employee) => employee.designationId != null).length;
  const departmentsCovered = new Set(
    items.map((designation) => designation.departmentId).filter(isNumber),
  ).size;

  useEffect(() => {
    if (selectedId && !items.some((designation) => designation.id === selectedId)) {
      setSelectedId(null);
    }
  }, [items, selectedId]);

  async function refreshDesignations() {
    setIsRefreshing(true);
    try {
      await Promise.all([
        dispatch(fetchDesignations({ force: true })).unwrap(),
        employees.refetch(),
      ]);
      toast.success("Designations refreshed", "The latest designations were loaded.");
    } catch (err) {
      toast.error("Couldn't refresh designations", getApiErrorMessage(err));
    } finally {
      setIsRefreshing(false);
    }
  }

  function openUpdate(designation: Designation) {
    setSelectedId(designation.id);
    setDialog("update");
  }

  function openDelete(designation: Designation) {
    setSelectedId(designation.id);
    setDialog("delete");
  }

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Organization"
          title="Designations"
          description="Define job titles and roles across departments."
         
        />

        <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <MetricCard
            icon={<Briefcase size={22} />}
            tone="blue"
            value={items.length}
            label="Total designations"
          />
          <MetricCard
            icon={<Users size={22} />}
            tone="emerald"
            value={peopleAssigned}
            label="People assigned"
          />
          <MetricCard
            icon={<Building2 size={22} />}
            tone="amber"
            value={departmentsCovered}
            label="Departments covered"
          />
        </section>
<div className="flex items-center justify-between gap-6">
 <div className="w-full max-w-2xl">
        <SearchBox value={query} placeholder="Search designations..." onChange={setQuery} />
 </div>
             <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setDialog("create")}
                className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-7 text-sm font-medium text-white shadow transition-colors hover:bg-primary/90"
              >
                <Plus size={17} />
                Designation
              </button>
              <button
                type="button"
                onClick={() => void refreshDesignations()}
                disabled={isRefreshing}
                aria-label={isRefreshing ? "Refreshing designations" : "Refresh designations"}
                title="Refresh designations"
                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-border bg-surface-elevated text-foreground shadow transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-70"
              >
                <RefreshCw size={18} className={isRefreshing ? "animate-spin" : undefined} />
              </button>
            </div>
         </div> 
        {error ? (
          <ErrorDisplay
            message={`Failed to load designations: ${error}`}
          />
        ) : isLoading ? (
          <CardSkeleton count={3} />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={Layers3}
            title={query ? "No designations match" : "No designations yet"}
            description={
              query
                ? "Try another title or clear the search."
                : "Create designations and optionally attach them to departments."
            }
            action={
              <button
                type="button"
                onClick={() => setDialog("create")}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-primary/90"
              >
                <Plus size={14} />
                Create designation
              </button>
            }
          />
        ) : (
          <DesignationsTable
            items={filteredItems}
            peopleCounts={peopleCounts}
            onEdit={openUpdate}
            onDelete={openDelete}
          />
        )}
      </div>

      <DesignationFormDialog
        mode="create"
        open={dialog === "create"}
        departments={departmentItems}
        onClose={() => setDialog("none")}
      />
      <DesignationFormDialog
        mode="update"
        open={dialog === "update"}
        designation={selectedDesignation}
        departments={departmentItems}
        onClose={() => setDialog("none")}
      />
      <DeleteDesignationDialog
        open={dialog === "delete"}
        designation={selectedDesignation}
        onClose={() => setDialog("none")}
        onDeleted={() => setSelectedId(null)}
      />
    </>
  );
}

function MetricCard({
  icon,
  tone,
  value,
  label,
}: {
  icon: React.ReactNode;
  tone: "blue" | "emerald" | "amber";
  value: number;
  label: string;
}) {
  const toneClass = {
    blue: "bg-primary-soft text-primary",
    emerald: "bg-success-soft text-success",
    amber: "bg-warning-soft text-warning",
  }[tone];

  return (
    <Card className="flex min-h-28 items-center gap-5 px-6">
      <span className={`grid h-14 w-14 place-items-center rounded-xl ${toneClass}`}>{icon}</span>
      <div>
        <p className="text-3xl font-bold text-foreground">
          <AnimatedNumber value={value} />
        </p>
        <p className="mt-1 text-sm font-medium text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
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
    <label className="relative block w-full">
      <Search
        size={16}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-border bg-surface-elevated pl-10 pr-4 text-sm text-foreground shadow outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

function DesignationsTable({
  items,
  peopleCounts,
  onEdit,
  onDelete,
}: {
  items: Designation[];
  peopleCounts: Map<number, number>;
  onEdit: (designation: Designation) => void;
  onDelete: (designation: Designation) => void;
}) {
  return (
    <Card padding="none">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-4">Title</th>
              <th className="px-5 py-4">Department</th>
              <th className="px-5 py-4">Level</th>
              <th className="px-5 py-4">People</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((designation, index) => {
              const level = inferLevel(designation.title);
              const people = peopleCounts.get(designation.id) ?? 0;
              return (
                <tr
                  key={designation.id}
                  className="border-b border-border last:border-0 hover:bg-surface-hover/70"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`grid h-10 w-10 place-items-center rounded-xl ${ROW_TONES[index % ROW_TONES.length] ?? ROW_TONES[0]}`}
                      >
                        <Briefcase size={18} />
                      </span>
                      <div>
                        <p className="font-semibold text-foreground">{designation.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {designationCode(designation)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-foreground">
                    {designation.departmentName ?? "Unassigned"}
                  </td>
                  <td className="px-5 py-4">
                    <LevelPill level={level} />
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm font-bold text-primary">{people}</span>
                    <span className="ml-1 text-xs text-muted-foreground">people</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1">
                      <IconButton label="Edit designation" onClick={() => onEdit(designation)}>
                        <Pencil size={15} />
                      </IconButton>
                      <IconButton
                        label="Delete designation"
                        onClick={() => onDelete(designation)}
                        danger
                      >
                        <Trash2 size={15} />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function LevelPill({ level }: { level: DesignationLevel }) {
  const toneMap: Record<DesignationLevel, "slate" | "blue" | "emerald"> = {
    Entry: "slate",
    Mid: "blue",
    Senior: "emerald",
  };
  return <StatusBadge label={level} tone={toneMap[level]} />;
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
      className={`grid h-9 w-9 place-items-center rounded-lg border transition-colors ${
        danger
          ? "border-danger-soft text-danger hover:bg-danger-soft"
          : "border-border text-muted-foreground hover:bg-surface-hover hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function DesignationFormDialog({
  mode,
  open,
  designation,
  departments,
  onClose,
}: {
  mode: "create" | "update";
  open: boolean;
  designation?: Designation | null;
  departments: Department[];
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const [values, setValues] = useState<DesignationInput>(EMPTY_DESIGNATION);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const toast = useToast();
  const isUpdate = mode === "update";

  useEffect(() => {
    if (!open) return;
    setTitleError(null);
    setPending(false);
    setValues(
      isUpdate && designation
        ? { title: designation.title, departmentId: designation.departmentId }
        : EMPTY_DESIGNATION,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isUpdate, designation?.id]);

  function update<K extends keyof DesignationInput>(key: K, value: DesignationInput[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (key === "title") setTitleError(null);
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input: DesignationInput = {
      title: values.title.trim(),
      departmentId: values.departmentId ?? null,
    };

    if (!input.title) {
      setTitleError("Designation title is required.");
      return;
    }

    setPending(true);

    try {
      if (isUpdate) {
        if (!designation) return;
        const updated = await dispatch(
          updateDesignationThunk({ id: designation.id, input }),
        ).unwrap();
        toast.success("Designation updated", `${updated.title} was saved.`);
        onClose();
      } else {
        const created = await dispatch(createDesignationThunk(input)).unwrap();
        toast.success("Designation created", `${created.title} is now available.`);
        onClose();
      }
    } catch (err) {
      const msg = getApiErrorMessage(
        err,
        `Couldn't ${isUpdate ? "update" : "create"} designation`,
      );
      toast.error(`Couldn't ${isUpdate ? "update" : "create"} designation`, msg);
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
      title={isUpdate ? "Update designation" : "Create designation"}
      size="md"
    >
      <form onSubmit={(e) => { void submit(e); }} noValidate>
        <div className="space-y-4 px-6 py-5">
          <Field
            id={`${mode}-designation-title`}
            label="Designation title"
            required
            error={titleError ?? undefined}
          >
            <input
              id={`${mode}-designation-title`}
              type="text"
              value={values.title}
              onChange={(e) => update("title", e.target.value)}
              disabled={pending}
              className={fieldClass(Boolean(titleError))}
              placeholder="Software Engineer"
            />
          </Field>

          <Field id={`${mode}-designation-department`} label="Department">
            <div className="relative">
              <Select
                id={`${mode}-designation-department`}
                value={values.departmentId ?? ""}
                onChange={(e) =>
                  update("departmentId", e.target.value ? Number(e.target.value) : null)
                }
                disabled={pending}
                className={fieldClass(Boolean(titleError))}
              >
                <option value="">Unassigned</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
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

function DeleteDesignationDialog({
  open,
  designation,
  onClose,
  onDeleted,
}: {
  open: boolean;
  designation: Designation | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const dispatch = useAppDispatch();
  const [pending, setPending] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (open) setPending(false);
  }, [open, designation?.id]);

  async function handleDelete() {
    if (!designation) return;
    setPending(true);
    try {
      const message = await dispatch(deleteDesignationThunk(designation.id)).unwrap();
      toast.success("Designation deleted", message || `${designation.title} was deleted.`);
      onDeleted();
      onClose();
    } catch (err) {
      toast.error("Couldn't delete designation", getApiErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <DeleteConfirmDialog
      open={open}
      title="Delete designation"
      name={designation?.title}
      pending={pending}
      disabled={!designation}
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
        <p className="mt-1 text-xs text-muted-foreground">
          This removes it from active designation lists.
        </p>
      </div>
      <footer className="flex justify-end gap-2 border-t border-border bg-surface-muted px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="rounded-lg border border-border bg-surface-elevated px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={disabled || pending}
          className="inline-flex items-center gap-2 rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white shadow hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-50"
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
    <footer className="flex justify-end gap-2 border-t border-border bg-surface-muted px-6 py-4">
      <button
        type="button"
        onClick={onCancel}
        disabled={pending}
        className="rounded-lg border border-border bg-surface-elevated px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
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

function countByDesignation(employees: EmployeeListItem[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const employee of employees) {
    if (employee.designationId == null) continue;
    counts.set(employee.designationId, (counts.get(employee.designationId) ?? 0) + 1);
  }
  return counts;
}

function inferLevel(title: string): DesignationLevel {
  const normalized = title.toLowerCase();
  if (["senior", "manager", "lead", "head", "principal"].some((word) => normalized.includes(word)))
    return "Senior";
  if (
    ["junior", "intern", "trainee", "executive", "entry"].some((word) => normalized.includes(word))
  )
    return "Entry";
  return "Mid";
}

function designationCode(designation: Designation): string {
  return `DES-${String(designation.id).padStart(3, "0")}`;
}

function fieldClass(error: boolean): string {
  const base =
    "w-full rounded-lg border bg-surface-elevated px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 disabled:bg-surface-muted disabled:text-muted-foreground";
  const tone = error
    ? "border-danger-soft focus:border-danger focus:ring-danger/20"
    : "border-border focus:border-primary focus:ring-primary/20";
  return `${base} ${tone}`;
}

function isNumber(value: number | null): value is number {
  return typeof value === "number";
}
