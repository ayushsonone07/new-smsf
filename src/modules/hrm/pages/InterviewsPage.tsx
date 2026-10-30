import { useEffect, useRef, useState, useMemo } from "react";

import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Loader2,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  User,
  UserRoundCheck,
  Video,
  X,
  XCircle,
} from "lucide-react";

import { hrService } from "@features/hr";
import {
  useCreateInterview,
  useInterviews,
  useUpdateInterviewStatus,
  type Interview,
  type InterviewInput,
} from "@features/interviews";
import {
  AnimatedFilterSelect,
  PageHeader,
  EmptyState,
  Card,
  DatePicker,
  Dialog,
  DateRangePickerPopup,
  StaggerContainer,
  StaggerItem,
  type DateRangeValue,
} from "@shared/components/ui";
import { useToast } from "@shared/components/feedback";
import { useDebouncedValue } from "@shared/hooks";

import { Button } from "@hrm/components/ui/button";
import { Input } from "@hrm/components/ui/input";
import { Select } from "@hrm/components/ui/select";
import { Skeleton } from "@hrm/components/ui/skeleton";
import { cn } from "@hrm/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-primary-soft text-primary",
  CONFIRMED: "bg-success-soft text-success",
  COMPLETED: "bg-muted text-muted-foreground",
  CANCELLED: "bg-danger-soft text-danger",
  RESCHEDULED: "bg-warning-soft text-warning",
};

const MODE_ICONS: Record<string, typeof Video> = {
  VIDEO: Video,
  IN_PERSON: User,
  PHONE: Phone,
};

const STATUS_OPTIONS = [
  { value: "", label: "Status", icon: CalendarClock },
  { value: "SCHEDULED", label: "Scheduled", icon: CalendarDays, tone: "accent" as const },
  { value: "CONFIRMED", label: "Confirmed", icon: UserRoundCheck, tone: "accent" as const },
  { value: "COMPLETED", label: "Completed", icon: CheckCircle2 },
  { value: "CANCELLED", label: "Cancelled", icon: XCircle, tone: "warning" as const },
  { value: "RESCHEDULED", label: "Rescheduled", icon: RotateCcw, tone: "warning" as const },
];

export default function InterviewsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [statusModalInterview, setStatusModalInterview] = useState<Interview | null>(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeValue>({ from: "", to: "" });

  const debouncedSearch = useDebouncedValue(search, 300);

  const interviewParams = useMemo(
    () => ({
      ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
      ...(statusFilter && { status: statusFilter }),
      ...(dateRange.from && { startDate: dateRange.from }),
      ...(dateRange.to && { endDate: dateRange.to }),
      page,
      size: 10,
    }),
    [debouncedSearch, statusFilter, dateRange.from, dateRange.to, page],
  );

  const { data, isLoading, refetch, isFetching } = useInterviews(interviewParams);
  const createInterview = useCreateInterview();
  const updateStatus = useUpdateInterviewStatus();
  const toast = useToast();

  const interviews = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const hasFilters = Boolean(search || statusFilter || dateRange.from || dateRange.to);

  const handleSchedule = async (formData: InterviewInput) => {
    await createInterview.mutateAsync(formData);
    setScheduleOpen(false);
  };

  const handleStatusChange = async (id: number, status: string) => {
    if (id < 0) return;
    await updateStatus.mutateAsync({ id, data: { status } });
  };

  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <PageHeader
          eyebrow="Recruitment"
          title="Interviews"
          description="Schedule and track candidate interview rounds."
          actions={
            <div className="flex items-center gap-2">
              <RefreshIconButton
                refreshing={isFetching}
                onClick={async () => {
                  await refetch();
                  toast.success("Refresh successfully");
                }}
              />
              <Button onClick={() => setScheduleOpen(true)}>
                <Plus size={16} /> Schedule Interview
              </Button>
            </div>
          }
        />
      </StaggerItem>

      <Dialog
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        title="Schedule interview"
        description="Set the interview details and notify the team with confidence."
        size="lg"
        className="border-border shadow-[0_24px_70px_rgba(15,23,42,0.22)]"
      >
        <ScheduleForm
          onSubmit={(formData) => {
            void handleSchedule(formData);
          }}
          loading={createInterview.isPending}
          onCancel={() => setScheduleOpen(false)}
        />
      </Dialog>

      <StaggerItem variant="card">
        <Card
          padding="md"
          className="border-border/90 bg-card/90 shadow-[0_12px_28px_rgba(15,23,42,0.05)]"
        >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-card-foreground">Find interviews</p>
            <p className="text-xs text-muted-foreground">
              Search candidates or narrow the schedule by status.
            </p>
          </div>
          <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary">
            {meta?.totalElements ?? interviews.length} total
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px_280px_auto]">
          <div className="relative min-w-0">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search candidate name..."
              className="h-10 rounded-xl border-border bg-surface-muted pl-10 shadow-none transition-all focus:bg-card"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <DateRangePickerPopup
            value={dateRange}
            onChange={setDateRange}
            placeholder="Select Date"
            buttonClassName="w-full"
          />
          <AnimatedFilterSelect
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setPage(0);
            }}
            options={STATUS_OPTIONS}
            ariaLabel="Filter interviews by status"
            className="w-full"
          />
          {hasFilters ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearch("");
                setStatusFilter("");
                setDateRange({ from: "", to: "" });
                setPage(0);
              }}
              className="h-10 rounded-xl px-3"
            >
              <RotateCcw size={15} /> Clear
            </Button>
          ) : null}
        </div>
     
<div className="mt-5 border-t border-border/70" />
<div
  className={`pt-5 transition-opacity ${isFetching && !isLoading ? "pointer-events-none opacity-60" : ""}`}
  aria-busy={isFetching && !isLoading}
>
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : interviews.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={hasFilters ? "No matching interviews" : "No interviews found"}
          description={
            hasFilters
              ? "Try a different candidate name or status."
              : "Schedule your first interview to get started."
          }
          action={
            hasFilters ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("");
                  setPage(0);
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Button onClick={() => setScheduleOpen(true)}>
                <Plus size={16} /> Schedule Interview
              </Button>
            )
          }
          className="min-h-[280px] border-border bg-card/80"
        />
      ) : (
        <>
          <div className="space-y-4">
            {interviews.map((interview) => (
              <InterviewCard
                key={interview.id}
                interview={interview}
                onOpenStatusModal={(iv) => {
                  setStatusModalInterview(iv);
                  setSelectedStatus(iv.status);
                }}
              />
            ))}
          </div>

          <Dialog
            open={Boolean(statusModalInterview)}
            onClose={() => setStatusModalInterview(null)}
            title="Update Interview Status"
            size="sm"
          >
            {statusModalInterview ? (
              <div className="space-y-4">
                {statusModalInterview.status === "COMPLETED" ? (
                  <p className="text-sm text-muted-foreground">This interview is completed. Status cannot be changed.</p>
                ) : (
                  <>
                    <Select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                      {statusModalInterview.status === "CANCELLED" ? (
                        <>
                          <option value="CANCELLED">Cancelled</option>
                          <option value="RESCHEDULED">Rescheduled</option>
                        </>
                      ) : statusModalInterview.status === "RESCHEDULED" ? (
                        <>
                          <option value="RESCHEDULED">Rescheduled</option>
                          <option value="CANCELLED">Cancelled</option>
                          <option value="COMPLETED">Completed</option>
                        </>
                      ) : (
                        <>
                          <option value="SCHEDULED">Scheduled</option>
                          <option value="CONFIRMED">Confirmed</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                          <option value="RESCHEDULED">Rescheduled</option>
                        </>
                      )}
                    </Select>
                    <Button
                      onClick={async () => {
                        await handleStatusChange(statusModalInterview.id, selectedStatus);
                        setStatusModalInterview(null);
                      }}
                    >
                      Update
                    </Button>
                  </>
                )}
              </div>
            ) : null}
          </Dialog>

          {totalPages > 1 ? (
            <div className="flex items-center justify-center gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      )}
      </div>
        </Card>
      </StaggerItem>
    </StaggerContainer>
  );
}

function InterviewCard({
  interview,
  onOpenStatusModal,
}: {
  interview: Interview;
  onOpenStatusModal: (interview: Interview) => void;
}) {
  const ModeIcon = MODE_ICONS[interview.mode] ?? Video;
  const isCompleted = interview.status === "COMPLETED";

  return (
    <Card
      padding="md"
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-card-foreground">{interview.candidateName}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[interview.status] ?? ""}`}
          >
            {interview.status}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarDays size={12} />
            {interview.scheduledDate}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {interview.scheduledTime}
          </span>
          <span className="flex items-center gap-1">
            <ModeIcon size={12} />
            {interview.mode}
          </span>
          <span>{interview.round}</span>
          {interview.durationMinutes > 0 ? <span>{interview.durationMinutes} min</span> : null}
          {interview.interviewerName ? (
            <span className="flex items-center gap-1">
              <User size={12} />
              {interview.interviewerName}
            </span>
          ) : null}
          {interview.location ? (
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {interview.location}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={isCompleted}
          title={isCompleted ? "Completed interview status cannot be changed" : undefined}
          onClick={() => onOpenStatusModal(interview)}
        >
          Change Status
        </Button>
      </div>
    </Card>
  );
}

function ScheduleForm({
  onSubmit,
  loading,
  onCancel,
}: {
  onSubmit: (data: InterviewInput) => void;
  loading: boolean;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<InterviewInput>({
    candidateId: 0,
    round: "First Round",
    mode: "VIDEO",
    scheduledDate: "",
    scheduledTime: "",
    durationMinutes: 60,
  });
  const [candidate, setCandidate] = useState<SelectOption | null>(null);
  const [interviewer, setInterviewer] = useState<SelectOption | null>(null);

  function selectCandidate(option: SelectOption | null) {
    setCandidate(option);
    setForm((prev) => ({ ...prev, candidateId: option?.value ?? 0 }));
  }

  function selectInterviewer(option: SelectOption | null) {
    setInterviewer(option);
    setForm((prev) =>
      option
        ? { ...prev, interviewerId: option.value }
        : (({ interviewerId: _removed, ...rest }) => rest)(prev),
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.candidateId || !form.scheduledDate || !form.scheduledTime) return;
    onSubmit(form);
  };

  const update = (patch: Partial<InterviewInput>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <SearchSelect
        id="interview-candidate"
        label="Candidate"
        required
        placeholder="Search candidate by name…"
        hint="Type at least 2 characters to search candidates."
        minChars={2}
        selected={candidate}
        onSelect={selectCandidate}
        fetchOptions={fetchCandidates}
      />
      <SearchSelect
        id="interview-interviewer"
        label="Interviewer"
        placeholder="Search employee by name or code…"
        hint="Type at least 2 characters to search employees."
        minChars={2}
        selected={interviewer}
        onSelect={selectInterviewer}
        fetchOptions={fetchEmployees}
      />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="interview-round" className="text-sm font-medium">Round *</label>
          <Input id="interview-round" required value={form.round} onChange={(e) => update({ round: e.target.value })} />
        </div>
        <div>
          <label htmlFor="interview-mode" className="text-sm font-medium">Mode *</label>
          <Select id="interview-mode" value={form.mode} onChange={(e) => update({ mode: e.target.value })}>
            <option value="VIDEO">Video</option>
            <option value="IN_PERSON">In Person</option>
            <option value="PHONE">Phone</option>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="interview-date" className="text-sm font-medium">Date *</label>
          <DatePicker
            id="interview-date"
            required
            value={form.scheduledDate}
            onChange={(value) => update({ scheduledDate: value })}
            ariaLabel="Choose interview date"
          />
        </div>
        <div>
          <label htmlFor="interview-time" className="text-sm font-medium">Time *</label>
          <Input
            id="interview-time"
            type="time"
            required
            value={form.scheduledTime}
            onChange={(e) => update({ scheduledTime: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="interview-duration" className="text-sm font-medium">Duration (min)</label>
          <Input
            id="interview-duration"
            type="number"
            value={form.durationMinutes}
            onChange={(e) => update({ durationMinutes: Number(e.target.value) })}
          />
        </div>
        <div>
          <label htmlFor="interview-location" className="text-sm font-medium">Location</label>
          <Input
            id="interview-location"
            value={form.location ?? ""}
            onChange={(e) => update({ location: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label htmlFor="interview-meeting-link" className="text-sm font-medium">Meeting Link</label>
        <Input
          id="interview-meeting-link"
          value={form.meetingLink ?? ""}
          onChange={(e) => update({ meetingLink: e.target.value })}
        />
      </div>
      <div>
        <label htmlFor="interview-notes" className="text-sm font-medium">Notes</label>
        <textarea
          id="interview-notes"
          className="w-full rounded-xl border border-border bg-card p-2.5 text-sm"
          rows={2}
          value={form.notes ?? ""}
          onChange={(e) => update({ notes: e.target.value })}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading ? "Scheduling..." : "Schedule Interview"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

interface SelectOption {
  value: number;
  label: string;
  sublabel?: string;
  badge?: string;
}

const EXCLUDED_INTERVIEW_STATUSES = new Set(["HIRED", "REJECTED", "WITHDRAWN"]);

async function fetchCandidates(q: string): Promise<SelectOption[]> {
  if (q.trim().length < 2) return [];
  const { items } = await hrService.searchCandidates(q.trim(), 0, 25, {});
  return items
    .filter((c) => !EXCLUDED_INTERVIEW_STATUSES.has((c.status ?? "").toUpperCase()))
    .slice(0, 8)
    .map((c) => ({
      value: c.id,
      label: c.name,
      sublabel: c.email,
      badge: c.status?.replaceAll("_", " ") || "ACTIVE",
    }));
}

async function fetchEmployees(q: string): Promise<SelectOption[]> {
  if (q.trim().length < 2) return [];
  const { items } = await hrService.listEmployees({
    page: 0,
    size: 8,
    q: q.trim(),
    status: "active",
    sort: "employeeCode,asc",
  });
  return items.map((e) => ({
    value: e.id,
    label: e.name,
    sublabel: [e.employeeCode, e.designationName].filter(Boolean).join(" • "),
    badge: e.role?.toUpperCase(),
  }));
}

function SearchSelect({
  id,
  label,
  required,
  placeholder,
  hint,
  minChars,
  selected,
  onSelect,
  fetchOptions,
}: {
  id: string;
  label: string;
  required?: boolean | undefined;
  placeholder: string;
  hint: string;
  minChars: number;
  selected: SelectOption | null;
  onSelect: (option: SelectOption | null) => void;
  fetchOptions: (q: string) => Promise<SelectOption[]>;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 300);
  const canFetch = debouncedQuery.trim().length >= minChars;

  const { data = [], isFetching } = useQuery({
    queryKey: ["interview-search", id, debouncedQuery.trim().toLowerCase()],
    queryFn: () => fetchOptions(debouncedQuery.trim()),
    enabled: open && canFetch,
  });

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function toggle() {
    setOpen((current) => !current);
    if (!open) setQuery("");
  }

  function choose(option: SelectOption) {
    onSelect(option);
    setOpen(false);
    setQuery("");
  }

  function clear() {
    onSelect(null);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={rootRef}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </label>
      <div className="relative mt-1">
        <button
          type="button"
          id={id}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={toggle}
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 rounded-xl border bg-white px-3 text-sm shadow transition",
            open ? "border-sky-400 ring-2 ring-sky-100" : selected ? "border-emerald-300 bg-emerald-50/50" : "border-slate-200",
          )}
        >
          <span className={cn("min-w-0 truncate text-left", selected ? "font-semibold text-emerald-800" : "text-slate-400")}>
            {selected ? selected.label : placeholder}
          </span>
          {selected ? (
            <span className="flex items-center gap-1.5">
              {selected.badge ? (
                <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-indigo-700">
                  {selected.badge}
                </span>
              ) : null}
              {selected.sublabel ? (
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                  {selected.sublabel}
                </span>
              ) : null}
              <button
                type="button"
                aria-label="Clear selected"
                onClick={(e) => {
                  e.stopPropagation();
                  clear();
                }}
                className="grid h-5 w-5 place-items-center rounded text-slate-500 transition hover:bg-white hover:text-slate-800"
              >
                <X size={14} />
              </button>
            </span>
          ) : (
            <ChevronDown size={16} className={cn("shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
          )}
        </button>

        {open ? (
          <div role="listbox" className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="relative border-b border-slate-100 p-2">
              <Search size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                aria-label={`Search ${label.toLowerCase()}`}
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm outline-none focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
              />
            </div>
            <div className="max-h-56 overflow-auto py-1">
              {!canFetch ? (
                <p className="px-3 py-2.5 text-xs text-slate-400">{hint}</p>
              ) : isFetching ? (
                <p className="flex items-center gap-2 px-3 py-2.5 text-xs text-slate-400">
                  <Loader2 size={14} className="animate-spin" /> Searching…
                </p>
              ) : data.length === 0 ? (
                <p className="px-3 py-2.5 text-xs text-slate-400">No matches found.</p>
              ) : (
                data.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={option.value === selected?.value}
                    onClick={() => choose(option)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-sky-50",
                      option.value === selected?.value && "bg-sky-50",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-800">{option.label}</span>
                      {option.sublabel ? (
                        <span className="block truncate text-xs text-slate-400">{option.sublabel}</span>
                      ) : null}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {option.badge ? (
                        <span className="rounded border border-indigo-500/20 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase text-indigo-700">
                          {option.badge}
                        </span>
                      ) : null}
                      {option.value === selected?.value ? <Check size={15} className="text-emerald-600" /> : null}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function RefreshIconButton({ refreshing, onClick }: { refreshing: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (!refreshing) {
          void onClick();
        }
      }}
      disabled={refreshing}
      aria-label="Refresh interviews"
      title="Refresh interviews"
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface-elevated text-foreground transition-colors hover:border-border-strong hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
    >
      <RefreshCw size={17} className={refreshing ? "animate-spin" : ""} />
    </button>
  );
}
