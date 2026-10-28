import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import {
  Bell,
  CheckCircle2,
  Edit3,
  Loader2,
  Pin,
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
  Dialog,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  TableSkeleton,
} from "@shared/components/ui";
import { getApiErrorMessage } from "@shared/lib";
import { Select } from "@hrm/components/ui/select";
import { RefreshButton } from "@/components/ui/RefreshButton";

import {
  useCreateAnnouncement,
  useDeleteAnnouncement,
  useAnnouncements,
  useUpdateAnnouncement,
} from "../hooks";

import type { Announcement, AnnouncementInput, AnnouncementListParams, AnnouncementType } from "../types";

const ANNOUNCEMENT_TYPES: { value: AnnouncementType; label: string; tone: string }[] = [
  { value: "GENERAL", label: "General", tone: "bg-primary-soft text-primary border-primary/30" },
  { value: "HR", label: "HR", tone: "bg-info-soft text-info border-info/30" },
  { value: "COMPANY", label: "Company", tone: "bg-success-soft text-success border-success/30" },
  { value: "URGENT", label: "Urgent", tone: "bg-danger-soft text-danger border-danger/30" },
];

export function AnnouncementsPage() {
  const { role } = useAuth();
  const canManage = role === "ADMIN" || role === "HR" || role === "HR_HEAD";
  const toast = useToast();
  const deleteAnnouncement = useDeleteAnnouncement();
  const updateAnnouncement = useUpdateAnnouncement();

  const [type, setType] = useState<AnnouncementType | "">("");
  const [active, setActive] = useState<boolean | "">("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [toDelete, setToDelete] = useState<Announcement | null>(null);

  const params: AnnouncementListParams = {
    type,
    active,
    search,
    page: 1,
    size: 100,
    sort: "createdAt,desc",
  };
  const announcements = useAnnouncements(params);
  const records = announcements.data?.data ?? [];
  const pinnedCount = records.filter((item) => item.pinned).length;
  const activeCount = records.filter((item) => item.active).length;

  function openCreate() {
    setEditing(null);
    setShowDialog(true);
  }

  function openEdit(announcement: Announcement) {
    setEditing(announcement);
    setShowDialog(true);
  }

  function handleDelete(announcement: Announcement) {
    setToDelete(announcement);
  }

  function confirmDelete() {
    if (!toDelete) return;
    deleteAnnouncement.mutate(toDelete.id, {
      onSuccess: () => {
        toast.success("Announcement deleted.");
        setToDelete(null);
      },
      onError: (err) => {
        toast.error(getApiErrorMessage(err, "Failed to delete announcement."));
        setToDelete(null);
      },
    });
  }

  function toggleActive(announcement: Announcement) {
    const input = toInput({ ...announcement, active: !announcement.active });
    updateAnnouncement.mutate(
      { id: announcement.id, input },
      {
        onSuccess: () =>
          toast.success(announcement.active ? "Announcement deactivated." : "Announcement activated."),
        onError: (err) => toast.error(getApiErrorMessage(err, "Failed to update announcement.")),
      },
    );
  }

  function togglePinned(announcement: Announcement) {
    const input = toInput({ ...announcement, pinned: !announcement.pinned });
    updateAnnouncement.mutate(
      { id: announcement.id, input },
      {
        onSuccess: () =>
          toast.success(announcement.pinned ? "Announcement unpinned." : "Announcement pinned."),
        onError: (err) => toast.error(getApiErrorMessage(err, "Failed to update announcement.")),
      },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        description="Company announcements and updates."
        actions={
          canManage ? (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-all hover:brightness-110"
            >
              <Plus size={18} />
              Announcement
            </button>
          ) : undefined
        }
      />

      <div
        className={`grid gap-4 transition-opacity md:grid-cols-3 ${
          announcements.isFetching && !announcements.isLoading ? "pointer-events-none opacity-60" : ""
        }`}
      >
        <MetricCard label="Total announcements" value={records.length} />
        <MetricCard label="Active" value={activeCount} tone="success" />
        <MetricCard label="Pinned" value={pinnedCount} tone="violet" />
      </div>

      <Card padding="md">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search announcements..."
              className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm text-card-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </label>
          <div className="grid w-full grid-cols-2 gap-3 lg:w-[360px] lg:shrink-0">
            <AnimatedFilterSelect
              value={type}
              onValueChange={(nextType) => setType(nextType as AnnouncementType | "")}
              options={[
                { value: "", label: "Type" },
                ...ANNOUNCEMENT_TYPES.map((item) => ({ value: item.value, label: item.label })),
              ]}
              ariaLabel="Filter announcements by type"
            />
            <AnimatedFilterSelect
              value={active === "" ? "" : String(active)}
              onValueChange={(nextStatus) =>
                setActive(nextStatus === "" ? "" : nextStatus === "true")
              }
              options={[
                { value: "", label: "Status" },
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ]}
              ariaLabel="Filter announcements by status"
            />
          </div>
          <RefreshButton
            onRefresh={() => announcements.refetch()}
            isRefreshing={announcements.isFetching}
            label="announcements"
            className="h-10 w-10 shrink-0 self-end rounded-xl lg:self-auto"
          />
        </div>
      </Card>

      <Card
        padding="none"
        className={`overflow-hidden transition-opacity ${
          announcements.isFetching && !announcements.isLoading ? "pointer-events-none opacity-60" : ""
        }`}
      >
        {announcements.isLoading ? (
          <div className="p-5">
            <TableSkeleton rows={6} />
          </div>
        ) : announcements.error ? (
          <div className="p-10 text-center text-sm text-danger">
            {getApiErrorMessage(announcements.error, "Failed to load announcements.")}
          </div>
        ) : records.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={Bell}
              title="No announcements"
              description={canManage ? "Create an announcement to show it here." : "No announcements available right now."}
            />
          </div>
        ) : (
          <AnnouncementList
            records={records}
            canManage={canManage}
            pending={deleteAnnouncement.isPending || updateAnnouncement.isPending}
            onEdit={openEdit}
            onDelete={handleDelete}
            onToggleActive={toggleActive}
            onTogglePinned={togglePinned}
          />
        )}
      </Card>

      <AnnouncementDialog open={showDialog} announcement={editing} onClose={() => setShowDialog(false)} />
      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete announcement"
        description={toDelete ? `Delete "${toDelete.title}"? This action cannot be undone.` : undefined}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={deleteAnnouncement.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
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
    </Card>
  );
}

function AnnouncementList({
  records,
  canManage,
  pending,
  onEdit,
  onDelete,
  onToggleActive,
  onTogglePinned,
}: {
  records: Announcement[];
  canManage: boolean;
  pending: boolean;
  onEdit: (announcement: Announcement) => void;
  onDelete: (announcement: Announcement) => void;
  onToggleActive: (announcement: Announcement) => void;
  onTogglePinned: (announcement: Announcement) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-muted text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3">Announcement</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Audience</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Posted</th>
            {canManage ? <th className="px-4 py-3 text-right">Actions</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {records.map((announcement) => (
            <tr key={announcement.id} className="transition-colors hover:bg-surface-hover">
              <td className="px-4 py-3">
                <p className="flex items-center gap-2 font-semibold text-card-foreground">
                  {announcement.pinned ? <Pin size={14} className="shrink-0 text-primary" /> : null}
                  {announcement.title}
                </p>
                {announcement.content ? (
                  <p className="mt-1 max-w-[480px] truncate text-xs text-muted-foreground">
                    {announcement.content}
                  </p>
                ) : null}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <AnnouncementTypeBadge type={announcement.type} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-card-foreground">
                {announcement.targetAudience ?? "Everyone"}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${announcement.active ? "border-success/30 bg-success-soft text-success" : "border-border bg-surface-muted text-muted-foreground"}`}
                >
                  {announcement.active ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                  {announcement.active ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                {announcement.createdAt ? formatDate(announcement.createdAt) : "-"}
              </td>
              {canManage ? (
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onTogglePinned(announcement)}
                      disabled={pending}
                      className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-card-foreground shadow hover:bg-muted disabled:opacity-60"
                    >
                      {announcement.pinned ? "Unpin" : "Pin"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleActive(announcement)}
                      disabled={pending}
                      className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-card-foreground shadow hover:bg-muted disabled:opacity-60"
                    >
                      {announcement.active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(announcement)}
                      className="rounded-lg border border-primary/30 bg-primary-soft p-1.5 text-primary hover:bg-primary-soft/80"
                      aria-label="Edit announcement"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(announcement)}
                      disabled={pending}
                      className="rounded-lg border border-danger/30 bg-danger-soft p-1.5 text-danger hover:bg-danger-soft/80 disabled:opacity-60"
                      aria-label="Delete announcement"
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

function AnnouncementTypeBadge({ type }: { type: AnnouncementType }) {
  const meta = ANNOUNCEMENT_TYPES.find((item) => item.value === type) ?? ANNOUNCEMENT_TYPES[0]!;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.tone}`}
    >
      {meta.label}
    </span>
  );
}

function AnnouncementDialog({
  open,
  announcement,
  onClose,
}: {
  open: boolean;
  announcement: Announcement | null;
  onClose: () => void;
}) {
  const createAnnouncement = useCreateAnnouncement();
  const updateAnnouncement = useUpdateAnnouncement();
  const toast = useToast();
  const isEditing = Boolean(announcement);
  const [form, setForm] = useState<AnnouncementInput>(() =>
    announcement ? toInput(announcement) : emptyInput(),
  );

  useEffect(() => {
    if (open) setForm(announcement ? toInput(announcement) : emptyInput());
  }, [announcement, open]);

  const pending = createAnnouncement.isPending || updateAnnouncement.isPending;
  const typeMeta =
    ANNOUNCEMENT_TYPES.find((item) => item.value === form.type) ?? ANNOUNCEMENT_TYPES[0]!;

  function update<K extends keyof AnnouncementInput>(key: K, value: AnnouncementInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const input = {
      ...form,
      title: form.title.trim(),
      content: form.content?.trim() ?? null,
      targetAudience: form.targetAudience?.trim() ?? null,
    };
    const callbacks = {
      onSuccess: () => {
        toast.success(isEditing ? "Announcement updated." : "Announcement created.");
        onClose();
      },
      onError: (err: Error) =>
        toast.error(
          getApiErrorMessage(
            err,
            isEditing ? "Failed to update announcement." : "Failed to create announcement.",
          ),
        ),
    };
    if (announcement) updateAnnouncement.mutate({ id: announcement.id, input }, callbacks);
    else createAnnouncement.mutate(input, callbacks);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Announcement" : "New Announcement"}
      description="Share company news, updates, and notices with your team."
      size="lg"
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="rounded-xl border border-border bg-card px-4 py-3 shadow">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-card-foreground">
                {form.title.trim() ? form.title.trim() : "New announcement"}
              </p>
              <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                {form.targetAudience?.trim() ?? "Visible to everyone"}
              </p>
            </div>
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${typeMeta.tone}`}
            >
              {form.pinned ? "Pinned · " : ""}
              {typeMeta.label}
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" required className="sm:col-span-2">
            <input
              value={form.title}
              onChange={(event) => update("title", event.target.value)}
              required
              maxLength={200}
              placeholder="e.g. Diwali Holiday Schedule"
              className={formInputClass}
            />
          </Field>
          <Field label="Type" required>
            <Select
              value={form.type}
              onChange={(event) => update("type", event.target.value as AnnouncementType)}
              className={formInputClass}
            >
              {ANNOUNCEMENT_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Target audience">
            <input
              value={form.targetAudience ?? ""}
              onChange={(event) => update("targetAudience", event.target.value)}
              placeholder="e.g. HR Department"
              maxLength={30}
              className={formInputClass}
            />
          </Field>
        </div>

        <Field label="Content" className="sm:col-span-2">
          <textarea
            value={form.content ?? ""}
            onChange={(event) => update("content", event.target.value)}
            rows={5}
            placeholder="Write the announcement details..."
            className={`${formInputClass} min-h-32 resize-none py-3`}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <ToggleCard
            checked={form.pinned}
            title="Pin announcement"
            description="Keep this announcement at the top for employees."
            onChange={(checked) => update("pinned", checked)}
          />
          <ToggleCard
            checked={form.active}
            title="Active"
            description="Visible in announcement lists and feeds."
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
            {isEditing ? "Update Announcement" : "Post Announcement"}
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
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block text-sm font-semibold text-card-foreground ${className ?? ""}`}>
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
      <span>
        <span className="block text-sm font-semibold text-card-foreground">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={title}
        className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
      />
    </label>
  );
}

function emptyInput(): AnnouncementInput {
  return {
    title: "",
    content: "",
    type: "GENERAL",
    targetAudience: "",
    pinned: false,
    active: true,
  };
}

function toInput(announcement: Announcement): AnnouncementInput {
  return {
    title: announcement.title,
    content: announcement.content ?? "",
    type: announcement.type,
    targetAudience: announcement.targetAudience ?? "",
    pinned: announcement.pinned,
    active: announcement.active,
  };
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}