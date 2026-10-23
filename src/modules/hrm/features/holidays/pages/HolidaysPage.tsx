import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

import {
  CalendarDays,
  CheckCircle2,
  Edit3,
  Loader2,
  Plus,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";

import { useAuth } from "@features/auth";
import { useToast } from "@shared/components/feedback";
import {
  AnimatedFilterSelect,
  Card,
  DatePicker,
  Dialog,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  StaggerContainer,
  StaggerItem,
  TableSkeleton,
} from "@shared/components/ui";
import { Select } from "@hrm/components/ui/select";
import { getApiErrorMessage } from "@shared/lib";

import { useCreateHoliday, useDeleteHoliday, useHolidays, useUpdateHoliday } from "../hooks";

import type { Holiday, HolidayInput, HolidayListParams, HolidayType } from "../types";

const HOLIDAY_TYPES: Array<{ value: HolidayType; label: string; tone: string }> = [
  { value: "NATIONAL", label: "National", tone: "bg-primary-soft text-primary border-primary/30" },
  { value: "REGIONAL", label: "Regional", tone: "bg-warning-soft text-warning border-warning/30" },
  { value: "COMPANY", label: "Company", tone: "bg-success-soft text-success border-success/30" },
  { value: "OPTIONAL", label: "Optional", tone: "bg-info-soft text-info border-info/30" },
];

const MONTHS = [
  { value: "", label: "Month" },
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const currentYear = new Date().getFullYear();

export function HolidaysPage() {
  const { role } = useAuth();
  const canManage = role === "ADMIN" || role === "HR" || role === "HR_HEAD";
  const toast = useToast();
  const deleteHoliday = useDeleteHoliday();
  const updateHoliday = useUpdateHoliday();

  const [year, _setYear] = useState(currentYear);
  const [month, setMonth] = useState<number | "">("");
  const [type, setType] = useState<HolidayType | "">("");
  const [active, _setActive] = useState<boolean | "">("");
  const [region, setRegion] = useState("");
  const [editing, setEditing] = useState<Holiday | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [toDelete, setToDelete] = useState<Holiday | null>(null);

  const params: HolidayListParams = {
    year,
    month,
    type,
    active,
    region,
    page: 1,
    size: 100,
    sort: "holidayDate,asc",
  };
  const holidays = useHolidays(params);
  const records = holidays.data?.data ?? [];
  const upcoming = useMemo(() => getUpcoming(records), [records]);
  const activeCount = records.filter((item) => item.active).length;
  const optionalCount = records.filter((item) => item.optional).length;

  function openCreate() {
    setEditing(null);
    setShowDialog(true);
  }

  function openEdit(holiday: Holiday) {
    setEditing(holiday);
    setShowDialog(true);
  }

  function handleDelete(holiday: Holiday) {
    setToDelete(holiday);
  }

  function confirmDelete() {
    if (!toDelete) return;
    deleteHoliday.mutate(toDelete.id, {
      onSuccess: () => {
        toast.success("Holiday deleted.");
        setToDelete(null);
      },
      onError: (err) => {
        toast.error(getApiErrorMessage(err, "Failed to delete holiday."));
        setToDelete(null);
      },
    });
  }

  function toggleActive(holiday: Holiday) {
    const input = toInput({ ...holiday, active: !holiday.active });
    updateHoliday.mutate(
      { id: holiday.id, input },
      {
        onSuccess: () =>
          toast.success(holiday.active ? "Holiday deactivated." : "Holiday activated."),
        onError: (err) => toast.error(getApiErrorMessage(err, "Failed to update holiday.")),
      },
    );
  }

  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <PageHeader
          title="Holidays"
          description="Manage company holidays and regional observances."
          actions={
            canManage ? (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-all hover:brightness-110"
              >
                <Plus size={18} />
                Holiday
              </button>
            ) : undefined
          }
        />
      </StaggerItem>

      <StaggerItem variant="card">
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Total holidays" value={records.length} />
          <MetricCard label="Active" value={activeCount} tone="success" />
          <MetricCard label="Optional" value={optionalCount} tone="violet" />
          <MetricCard
            label="Next holiday"
            value={upcoming ? formatShortDate(upcoming.holidayDate) : "-"}
            {...(upcoming ? { subtitle: upcoming.name } : {})}
          />
        </div>
      </StaggerItem>

      <StaggerItem variant="card">
      <Card padding="md">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              placeholder="Search region..."
              className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm text-card-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </label>
          <div className="grid w-full grid-cols-2 gap-3 lg:w-[360px] lg:shrink-0">
            <AnimatedFilterSelect
              value={String(month)}
              onValueChange={(nextMonth) => setMonth(nextMonth ? Number(nextMonth) : "")}
              options={MONTHS.map((item) => ({ value: String(item.value), label: item.label }))}
              ariaLabel="Filter holidays by month"
            />
            <AnimatedFilterSelect
              value={type}
              onValueChange={(nextType) => setType(nextType as HolidayType | "")}
              options={[
                { value: "", label: "Type" },
                ...HOLIDAY_TYPES.map((item) => ({ value: item.value, label: item.label })),
              ]}
              ariaLabel="Filter holidays by type"
            />
          </div>
        </div>
      </Card>
      </StaggerItem>

      <StaggerItem variant="card">
      <Card padding="none" className="overflow-hidden">
        {holidays.isLoading ? (
          <div className="p-5">
            <TableSkeleton rows={6} />
          </div>
        ) : holidays.error ? (
          <div className="p-10 text-center text-sm text-danger">
            {getApiErrorMessage(holidays.error, "Failed to load holidays.")}
          </div>
        ) : records.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={CalendarDays}
              title="No holidays"
              description="Add holidays for this year to show them here."
            />
          </div>
        ) : (
          <HolidayTable
            records={records}
            canManage={canManage}
            pending={deleteHoliday.isPending || updateHoliday.isPending}
            onEdit={openEdit}
            onDelete={handleDelete}
            onToggleActive={toggleActive}
          />
        )}
      </Card>
      </StaggerItem>

      <HolidayDialog open={showDialog} holiday={editing} onClose={() => setShowDialog(false)} />
      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete holiday"
        description={toDelete ? `Delete ${toDelete.name}? This action cannot be undone.` : undefined}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={deleteHoliday.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </StaggerContainer>
  );
}

function MetricCard({
  label,
  value,
  subtitle,
  tone = "default",
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  tone?: "default" | "success" | "violet";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "violet"
        ? "text-info"
        : "text-card-foreground";
  return (
    <Card padding="md">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-extrabold ${toneClass}`}>{value}</p>
      {subtitle ? <p className="mt-1 truncate text-xs text-muted-foreground">{subtitle}</p> : null}
    </Card>
  );
}

function HolidayTable({
  records,
  canManage,
  pending,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  records: Holiday[];
  canManage: boolean;
  pending: boolean;
  onEdit: (holiday: Holiday) => void;
  onDelete: (holiday: Holiday) => void;
  onToggleActive: (holiday: Holiday) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-muted text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3">Holiday</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Region</th>
            <th className="px-4 py-3">Status</th>
            {canManage ? <th className="px-4 py-3 text-right">Actions</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {records.map((holiday) => (
            <tr key={holiday.id} className="transition-colors hover:bg-surface-hover">
              <td className="px-4 py-3">
                <p className="font-semibold text-card-foreground">{holiday.name}</p>
                {holiday.description ? (
                  <p className="mt-1 max-w-[340px] truncate text-xs text-muted-foreground">
                    {holiday.description}
                  </p>
                ) : null}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-card-foreground">
                <p className="font-semibold">{formatDate(holiday.holidayDate)}</p>
                <p className="text-xs text-muted-foreground">{formatWeekday(holiday.holidayDate)}</p>
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <HolidayTypeBadge type={holiday.type} optional={holiday.optional} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-card-foreground">
                {holiday.region || "All locations"}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${holiday.active ? "border-success/30 bg-success-soft text-success" : "border-border bg-surface-muted text-muted-foreground"}`}
                >
                  {holiday.active ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                  {holiday.active ? "Active" : "Inactive"}
                </span>
              </td>
              {canManage ? (
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleActive(holiday)}
                      disabled={pending}
                      className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-card-foreground shadow hover:bg-muted disabled:opacity-60"
                    >
                      {holiday.active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(holiday)}
                      className="rounded-lg border border-primary/30 bg-primary-soft p-1.5 text-primary hover:bg-primary-soft/80"
                      aria-label="Edit holiday"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(holiday)}
                      disabled={pending}
                      className="rounded-lg border border-danger/30 bg-danger-soft p-1.5 text-danger hover:bg-danger-soft/80 disabled:opacity-60"
                      aria-label="Delete holiday"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HolidayTypeBadge({ type, optional }: { type: HolidayType; optional: boolean }) {
  const meta = HOLIDAY_TYPES.find((item) => item.value === type) ?? HOLIDAY_TYPES[0]!;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.tone}`}
    >
      {meta.label}
      {optional ? " Optional" : ""}
    </span>
  );
}

function HolidayDialog({
  open,
  holiday,
  onClose,
}: {
  open: boolean;
  holiday: Holiday | null;
  onClose: () => void;
}) {
  const createHoliday = useCreateHoliday();
  const updateHoliday = useUpdateHoliday();
  const toast = useToast();
  const isEditing = Boolean(holiday);
  const [form, setForm] = useState<HolidayInput>(() => (holiday ? toInput(holiday) : emptyInput()));

  useEffect(() => {
    if (open) setForm(holiday ? toInput(holiday) : emptyInput());
  }, [holiday, open]);

  const pending = createHoliday.isPending || updateHoliday.isPending;
  const typeMeta = HOLIDAY_TYPES.find((item) => item.value === form.type) ?? HOLIDAY_TYPES[0]!;

  function update<K extends keyof HolidayInput>(key: K, value: HolidayInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const input = {
      ...form,
      name: form.name.trim(),
      region: form.region?.trim() || null,
      description: form.description?.trim() || null,
    };
    const callbacks = {
      onSuccess: () => {
        toast.success(isEditing ? "Holiday updated." : "Holiday created.");
        onClose();
      },
      onError: (err: Error) =>
        toast.error(
          getApiErrorMessage(
            err,
            isEditing ? "Failed to update holiday." : "Failed to create holiday.",
          ),
        ),
    };
    if (holiday) updateHoliday.mutate({ id: holiday.id, input }, callbacks);
    else createHoliday.mutate(input, callbacks);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Holiday" : "Add Holiday"}
      description="Create a calendar entry for company, national, regional, or optional holidays."
      size="lg"
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="rounded-xl border border-border bg-card px-4 py-3 shadow">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-card-foreground">
                {form.name.trim() || "New holiday"}
              </p>
              <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                {form.holidayDate 
                  ? `${formatDate(form.holidayDate)} · ${formatWeekday(form.holidayDate)}` 
                  : "Choose a holiday date"}
              </p>
            </div>
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${typeMeta.tone}`}
            >
              {typeMeta.label}
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Holiday name" required>
            <input
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              required
              maxLength={150}
              placeholder="e.g. Independence Day"
              className={formInputClass}
            />
          </Field>
          <Field label="Date" required>
            <DatePicker
              value={form.holidayDate}
              onChange={(value) => update("holidayDate", value)}
              required
              ariaLabel="Choose holiday date"
              buttonClassName={formInputClass}
            />
          </Field>
          <Field label="Type" required>
            <Select
              value={form.type}
              onChange={(event) => update("type", event.target.value as HolidayType)}
              className={formInputClass}
              aria-label="Holiday type"
            >
              {HOLIDAY_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Region">
            <input
              value={form.region ?? ""}
              onChange={(event) => update("region", event.target.value)}
              placeholder="All locations"
              maxLength={100}
              className={formInputClass}
            />
          </Field>
        </div>

        <Field label="Description">
          <textarea
            value={form.description ?? ""}
            onChange={(event) => update("description", event.target.value)}
            rows={4}
            maxLength={500}
            placeholder="Add a short note for employees..."
            className={`${formInputClass} min-h-28 resize-none py-3`}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <ToggleCard
            checked={form.optional}
            title="Optional holiday"
            description="Employees may choose whether to use this holiday."
            onChange={(checked) => update("optional", checked)}
          />
          <ToggleCard
            checked={form.active}
            title="Active"
            description="Visible in holiday lists and employee calendars."
            onChange={(checked) => update("active", checked)}
          />
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-card px-5 text-sm font-semibold text-card-foreground shadow transition-all hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow transition-all hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? <Loader2 size={16} className="animate-spin" /> : null}
            {isEditing ? "Update Holiday" : "Create Holiday"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

const formInputClass =
  "h-11 w-full rounded-lg border border-border bg-card px-3 text-sm font-medium text-card-foreground shadow outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm font-semibold text-card-foreground">
      <span className="mb-1.5 block">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function ToggleCard({
  checked,
  title,
  description,
  onChange,
}: {
  checked: boolean;
  title: string;
  description: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all ${checked ? "border-primary/30 bg-primary-soft" : "border-border bg-card hover:bg-surface-hover"}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
      />
      <span>
        <span className="block text-sm font-semibold text-card-foreground">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}
function emptyInput(): HolidayInput {
  return {
    name: "",
    holidayDate: new Date().toISOString().slice(0, 10),
    type: "COMPANY",
    region: "",
    description: "",
    optional: false,
    active: true,
  };
}

function toInput(holiday: Holiday): HolidayInput {
  return {
    name: holiday.name,
    holidayDate: holiday.holidayDate,
    type: holiday.type,
    region: holiday.region ?? "",
    description: holiday.description ?? "",
    optional: holiday.optional,
    active: holiday.active,
  };
}

function getUpcoming(records: Holiday[]): Holiday | null {
  const today = new Date().toISOString().slice(0, 10);
  return (
    records
      .filter((item) => item.active && item.holidayDate >= today)
      .sort((a, b) => a.holidayDate.localeCompare(b.holidayDate))[0] ?? null
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatShortDate(value: string): string {
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatWeekday(value: string): string {
  return new Date(value).toLocaleDateString("en-IN", { weekday: "long" });
}
