import { useEffect, useRef, useState, type ChangeEvent } from "react";

import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Filter,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  Send,
  UserPlus,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { useToast } from "@shared/components/feedback";
import { AnimatedFilterSelect } from "@shared/components/ui";
import { fromIsoUtc, getApiErrorMessage } from "@shared/lib";

import {
  useCandidatesList,
  useCandidatesSearch,
  useManualHiringApproval,
  useRequestHiringApproval,
} from "../hooks";
import { CANDIDATE_STATUSES } from "../types";
import { normalizeSourceKey, prettySource } from "../utils/source";

import { AdditionalInfoButton, AdditionalInfoDialog } from "./AdditionalInfoDialog";
import { CreateEmployeeDialog } from "./CreateEmployeeDialog";
import { InterviewMailDialog } from "./InterviewMailDialog";
import { RemarkCell } from "./RemarkCell";
import { ResumeActions } from "./ResumeActions";
import { StatusMenu } from "./StatusMenu";

import type { Candidate, CandidateStatus, DateRange } from "../types";

interface CandidatesSectionProps {
  range: DateRange;
  showRecruiter: boolean;
}

const PAGE_SIZE = 8;

const SOURCE_OPTIONS = [
  { value: "", label: "Source" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "naukri", label: "Naukri" },
  { value: "referral", label: "Referral" },
  { value: "walk_in", label: "Walk-in" },
  { value: "college", label: "College" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS: { value: "" | CandidateStatus; label: string }[] = [
  { value: "", label: "Status" },
  ...CANDIDATE_STATUSES.map((status) => ({ value: status, label: prettyStatus(status) })),
];

/**
 * Candidates table + search + filter + pagination.
 *
 * Two query branches:
 *   - list   (filtered, paginated) — useCandidatesList
 *   - search (text-driven)         — useCandidatesSearch (debounced inside the hook)
 *
 * When the search box has 2+ chars we switch to the search branch so list
 * filters don't get clobbered.
 */
export function CandidatesSection({ range, showRecruiter }: CandidatesSectionProps) {
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState<"" | CandidateStatus>("");
  const [page, setPage] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [creatingFrom, setCreatingFrom] = useState<Candidate | null>(null);
  const [mailingTo, setMailingTo] = useState<Candidate | null>(null);
  const [additionalInfoFor, setAdditionalInfoFor] = useState<Candidate | null>(null);
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const isSearching = search.trim().length >= 2;

  /**
   * Manual refresh — re-fetches only the candidates table that is on screen
   * (the list query, or the search query while searching).
   */
  async function onRefresh() {
    setIsRefreshing(true);
    try {
      const result = await (isSearching ? searchQuery : listQuery).refetch();
      if (result.error) throw result.error;
      toast.success("Candidates refreshed", "The latest candidates were loaded.");
    } catch (err) {
      toast.error("Couldn't refresh candidates", getApiErrorMessage(err));
    } finally {
      setIsRefreshing(false);
    }
  }

  function onSourceChange(value: string) {
    setSource(value);
    setPage(0);
  }
  function onStatusChange(value: string) {
    setStatus(value as "" | CandidateStatus);
    setPage(0);
  }
  function onSearchChange(e: ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(0);
  }

  const listQuery = useCandidatesList({
    range,
    source: source || undefined,
    status: status || undefined,
    page,
    size: PAGE_SIZE,
    sort: "createdAt,desc",
  });

  const searchQuery = useCandidatesSearch(search, page, PAGE_SIZE, {
    source: source || undefined,
    status: status || undefined,
    range,
  });

  const active = isSearching ? searchQuery : listQuery;
  const items = active.data?.items ?? [];
  const meta = active.data?.meta;

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow">
      <header className="flex flex-col gap-4 bg-white px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-950">All candidates</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {meta?.totalElements ?? items.length} total | sorted by newest
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
            <SearchBox value={search} onChange={onSearchChange} />
            <SourceSelect value={source} onChange={onSourceChange} />
            <StatusFilter value={status} onChange={onStatusChange} />
          </div>
          <div className="flex justify-end sm:justify-end">
            <RefreshButton onClick={() => void onRefresh()} isRefreshing={isRefreshing} />
          </div>
        </div>
      </header>

      {active.error ? (
        <p className="border-t border-slate-200 px-5 py-10 text-sm text-rose-600">
          Failed to load candidates: {active.error.message}
        </p>
      ) : active.isLoading && items.length === 0 ? (
        <TableSkeleton />
      ) : items.length === 0 ? (
        <p className="border-t border-slate-200 px-5 py-12 text-center text-sm text-slate-500">
          {isSearching ? "No candidates match your search." : "No candidates yet."}
        </p>
      ) : (
        <div
          className={`transition-opacity ${active.isFetching && !active.isLoading ? "pointer-events-none opacity-60" : ""}`}
          aria-busy={active.isFetching}
        >
        <Table
          items={items}
          showRecruiter={showRecruiter}
          onCreateEmployee={setCreatingFrom}
          onSendInterviewMail={setMailingTo}
          onOpenAdditionalInfo={setAdditionalInfoFor}
          onOpenOnboarding={(employeeId) =>
            void navigate(`/hrm/employees/${employeeId}/onboarding`, {
              state: {
                from: `${location.pathname}${location.search}`,
                label: "Back to candidates",
              },
            })
          }
        />
        </div>
      )}

      <Pagination
        page={meta?.page ?? page}
        size={meta?.size ?? PAGE_SIZE}
        total={meta?.totalElements ?? items.length}
        canPrev={page > 0}
        canNext={meta?.hasNext ?? false}
        onPrev={() => setPage((p) => Math.max(0, p - 1))}
        onNext={() => setPage((p) => p + 1)}
      />

      <CreateEmployeeDialog
        candidate={creatingFrom}
        onClose={() => setCreatingFrom(null)}
        onCreated={(employeeId) => {
          setCreatingFrom(null);
          void navigate(`/hrm/employees/${employeeId}/onboarding`, {
            state: { from: `${location.pathname}${location.search}`, label: "Back to candidates" },
          });
        }}
      />

      <InterviewMailDialog candidate={mailingTo} onClose={() => setMailingTo(null)} />
      <AdditionalInfoDialog
        candidate={additionalInfoFor}
        onClose={() => setAdditionalInfoFor(null)}
      />
    </section>
  );
}

/* Header controls */

function SearchBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="relative w-full max-w-xs">
      <Search
        size={14}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
      <input
        type="search"
        name="candidate-search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        onChange={onChange}
        placeholder="Search name, email, phone..."
        className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-100"
      />
    </div>
  );
}

function SourceSelect({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <AnimatedFilterSelect
      value={value}
      onValueChange={onChange}
      options={SOURCE_OPTIONS}
      ariaLabel="Filter candidates by source"
      disabled={disabled}
      className="w-full sm:w-[150px]"
    />
  );
}

function StatusFilter({
  value,
  onChange,
  disabled = false,
}: {
  value: "" | CandidateStatus;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <AnimatedFilterSelect
      value={value}
      onValueChange={onChange}
      options={STATUS_OPTIONS}
      ariaLabel={disabled ? "Clear search to filter by status" : "Filter candidates by status"}
      leadingIcon={Filter}
      disabled={disabled}
      className="w-full sm:w-[180px]"
    />
  );
}

function RefreshButton({ onClick, isRefreshing }: { onClick: () => void; isRefreshing: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isRefreshing}
      aria-label={isRefreshing ? "Refreshing candidates" : "Refresh candidates"}
      title="Refresh candidates"
      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition duration-150 ease-in-out hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <RefreshCw
        size={16}
        className={
          isRefreshing
            ? "animate-spin text-slate-700"
            : "text-slate-500 transition duration-150 ease-in-out hover:text-slate-900"
        }
      />
    </button>
  );
}

/* Header controls */

function Table({
  items,
  showRecruiter,
  onCreateEmployee,
  onSendInterviewMail,
  onOpenAdditionalInfo,
  onOpenOnboarding,
}: {
  items: Candidate[];
  showRecruiter: boolean;
  onCreateEmployee: (candidate: Candidate) => void;
  onSendInterviewMail: (candidate: Candidate) => void;
  onOpenAdditionalInfo: (candidate: Candidate) => void;
  onOpenOnboarding: (employeeId: number) => void;
}) {
  return (
    <div className="overflow-x-auto border-t border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <th className="px-5 py-3">Profile</th>
            <th className="px-5 py-3">Email</th>
            <th className="px-5 py-3">Phone</th>
            <th className="px-5 py-3">Source</th>
            {showRecruiter ? <th className="px-5 py-3">Hired By</th> : null}
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Remark</th>
            <th className="px-5 py-3 text-right">Additional Info</th>
            <th className="px-5 py-3">Added</th>
            <th className="px-5 py-3 text-right">Resume</th>
            <th className="px-5 py-3 text-right">Interview</th>
            <th className="px-5 py-3 text-right">Onboarding</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => {
            const isShortlisted = c.status.toUpperCase() === "SHORTLISTED";
            const cellClass = isShortlisted ? "bg-emerald-100/70" : "";

            return (
              <tr
                key={c.id}
                className={`border-t transition-colors ${
                  isShortlisted
                    ? "border-emerald-200 hover:[&>td]:bg-emerald-100"
                    : "border-slate-100 hover:bg-slate-50/50"
                }`}
              >
                <td className={`px-5 py-3.5 ${cellClass}`}>
                  <p className="max-w-[14rem] truncate font-medium text-slate-900" title={c.name}>
                    {c.name}
                  </p>
                </td>
                <td className={`px-5 py-3.5 text-slate-700 ${cellClass}`}>{c.email}</td>
                <td className={`whitespace-nowrap px-5 py-3.5 text-slate-700 ${cellClass}`}>
                  {c.phone}
                </td>
                <td className={`px-5 py-3.5 ${cellClass}`}>
                  <SourcePill source={c.source} />
                </td>
                {showRecruiter ? (
                  <td className={`whitespace-nowrap px-5 py-3.5 text-slate-700 ${cellClass}`}>
                    {c.recruiterName ?? (c.recruiterId ? `HR #${c.recruiterId}` : "Unassigned")}
                  </td>
                ) : null}
                <td className={`px-5 py-3.5 ${cellClass}`}>
                  <StatusMenu candidateId={c.id} status={c.status} />
                </td>
                <td className={`px-5 py-3.5 ${cellClass}`}>
                  <RemarkCell candidateId={c.id} candidateName={c.name} remark={c.remark} />
                </td>
                <td className={`px-5 py-3.5 text-right ${cellClass}`}>
                  <AdditionalInfoButton candidate={c} onClick={() => onOpenAdditionalInfo(c)} />
                </td>
                <td className={`whitespace-nowrap px-5 py-3.5 text-xs text-slate-500 ${cellClass}`}>
                  {formatAdded(c.createdAt)}
                </td>
                <td className={`px-5 py-3.5 text-right ${cellClass}`}>
                  <ResumeActions
                    candidateId={c.id}
                    candidateName={c.name}
                    resumeUrl={c.resumeUrl}
                  />
                </td>
                <td className={`px-5 py-3.5 text-right ${cellClass}`}>
                  <InterviewMailAction candidate={c} onClick={() => onSendInterviewMail(c)} />
                </td>
                <td className={`px-5 py-3.5 text-right ${cellClass}`}>
                  <OnboardingAction
                    candidate={c}
                    onCreate={() => onCreateEmployee(c)}
                    onOpen={() => (c.employeeId ? onOpenOnboarding(c.employeeId) : undefined)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function InterviewMailAction({
  candidate,
  onClick,
}: {
  candidate: Candidate;
  onClick: () => void;
}) {
  const canSend = candidate.email.trim().length > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!canSend}
      title={canSend ? "Compose interview mail" : "Candidate email is missing"}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
    >
      <Mail size={14} />
      Mail
    </button>
  );
}

function OnboardingAction({
  candidate,
  onCreate,
  onOpen,
}: {
  candidate: Candidate;
  onCreate: () => void;
  onOpen: () => void | undefined;
}) {
  const requestApproval = useRequestHiringApproval();
  const manualApproval = useManualHiringApproval();
  const toast = useToast();
  const [manualOpen, setManualOpen] = useState(false);
  const [manualPassword, setManualPassword] = useState("");

  if (candidate.employeeId) {
    return (
      <button
        type="button"
        onClick={onOpen}
        title="Open this employee's onboarding page"
        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
      >
        <ExternalLink size={14} />
        Open
      </button>
    );
  }

  const status = candidate.status.toUpperCase();
  const approvalStatus = candidate.hiringApprovalStatus;
  const canRequest = ["INTERVIEW", "OFFERED", "REQUEST_HIRING_APPROVAL"].includes(status);
  const canCreate = status === "REQUEST_HIRING_APPROVAL" && approvalStatus === "APPROVED";

  function request() {
    requestApproval.mutate(candidate.id, {
      onSuccess: (updated) => {
        if (updated.hiringApprovalStatus === "FAILED") {
          toast.error(
            "Couldn't send approval request",
            updated.hiringApprovalFailureReason ?? "TaskCRM did not accept the request.",
          );
          return;
        }
        toast.success("Hiring approval requested", "Waiting for TaskCRM acknowledgement.");
      },
      onError: (err) => toast.error("Couldn't request approval", getApiErrorMessage(err)),
    });
  }

  function approveManually() {
    manualApproval.mutate(
      { candidateId: candidate.id, password: manualPassword },
      {
        onSuccess: () => {
          setManualOpen(false);
          setManualPassword("");
          toast.success("Hiring approved inside HRM", "You can create the employee record now.");
        },
        onError: (err) => toast.error("Manual approval failed", getApiErrorMessage(err)),
      },
    );
  }

  const manualDisabled = !canRequest && status !== "REQUEST_HIRING_APPROVAL";
  const manualButton = (
    <ManualApprovalBox
      open={manualOpen}
      password={manualPassword}
      loading={manualApproval.isPending}
      disabled={manualDisabled}
      onOpen={() => setManualOpen((v) => !v)}
      onPasswordChange={setManualPassword}
      onCancel={() => {
        setManualOpen(false);
        setManualPassword("");
      }}
      onSubmit={approveManually}
    />
  );

  if (approvalStatus === "PENDING") {
    return (
      <div className="relative inline-flex items-center gap-1.5">
        <button
          type="button"
          disabled
          title={
            candidate.taskcrmRequestId
              ? `TaskCRM request: ${candidate.taskcrmRequestId}`
              : "Waiting for TaskCRM approval"
          }
          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-xs font-medium text-cyan-700 opacity-80"
        >
          <Loader2 size={14} className="animate-spin" />
          Pending
        </button>
        {manualButton}
      </div>
    );
  }

  if (approvalStatus === "REJECTED") {
    return (
      <button
        type="button"
        disabled
        title={candidate.hiringApprovalRemarks ?? "TaskCRM rejected this candidate"}
        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 opacity-80"
      >
        <AlertCircle size={14} />
        Rejected
      </button>
    );
  }

  if (canCreate) {
    return (
      <button
        type="button"
        onClick={onCreate}
        title="TaskCRM approved. Create employee record"
        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
      >
        <CheckCircle2 size={14} />
        Create
      </button>
    );
  }

  if (approvalStatus === "FAILED") {
    return (
      <div className="relative inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={request}
          disabled={requestApproval.isPending}
          title={
            candidate.hiringApprovalFailureReason ?? "Retry sending approval request to TaskCRM"
          }
          className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs font-medium text-orange-700 transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {requestApproval.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
          Retry
        </button>
        {manualButton}
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={request}
        disabled={!canRequest || requestApproval.isPending}
        title={
          canRequest
            ? "Request hiring approval from TaskCRM"
            : "Move candidate to Interview or Offered before requesting approval"
        }
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {requestApproval.isPending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <UserPlus size={14} />
        )}
        Request
      </button>
      {manualButton}
    </div>
  );
}

function ManualApprovalBox({
  open,
  password,
  loading,
  disabled,
  onOpen,
  onPasswordChange,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  password: string;
  loading: boolean;
  disabled: boolean;
  onOpen: () => void;
  onPasswordChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onOpen}
        disabled={disabled || loading}
        title="Approve inside HRM without TaskCRM"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700 transition-colors hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
      </button>

      {open ? (
        <form
          className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-xl"
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            if (password.trim()) onSubmit();
          }}
        >
          <label className="block text-xs font-medium text-slate-600">
            Manual approval password
            <input
              type="password"
              name="manual-hiring-approval-password"
              autoComplete="new-password"
              autoCorrect="off"
              spellCheck={false}
              value={password}
              ref={inputRef}
              onChange={(e) => onPasswordChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") onCancel();
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </label>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!password.trim() || loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <CheckCircle2 size={13} />
              )}
              Approve
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2 border-t border-slate-200 p-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
      ))}
    </div>
  );
}

/* Header controls */

interface PaginationProps {
  page: number;
  size: number;
  total: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

function Pagination({ page, size, total, canPrev, canNext, onPrev, onNext }: PaginationProps) {
  const start = total === 0 ? 0 : page * size + 1;
  const end = Math.min(total, page * size + size);
  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3.5 text-sm">
      <p className="text-xs text-slate-500">
        Showing <span className="font-medium text-slate-700">{start}</span>–
        <span className="font-medium text-slate-700">{end}</span> of{" "}
        <span className="font-medium text-slate-700">{total.toLocaleString()}</span>
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={!canPrev}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:bg-slate-50"
        >
          Prev
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:bg-slate-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

/* Header controls */

const SOURCE_PILLS: Record<string, { label: string; classes: string }> = {
  linkedin: { label: "LinkedIn", classes: "bg-indigo-50 text-indigo-700 ring-indigo-100" },
  naukri: { label: "Naukri", classes: "bg-orange-50 text-orange-700 ring-orange-100" },
  referral: { label: "Referral", classes: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  walk_in: { label: "Walk-in", classes: "bg-rose-50 text-rose-700 ring-rose-100" },
  college: { label: "College", classes: "bg-sky-50 text-sky-700 ring-sky-100" },
  collage: { label: "College", classes: "bg-sky-50 text-sky-700 ring-sky-100" },
  other: { label: "Other", classes: "bg-slate-100 text-slate-700 ring-slate-200" },
};

function SourcePill({ source }: { source: string }) {
  const key = normalizeSourceKey(source);
  const s = SOURCE_PILLS[key] ?? {
    label: prettySource(source),
    classes: SOURCE_PILLS.other!.classes,
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${s.classes}`}
    >
      {s.label}
    </span>
  );
}

function prettyStatus(status: CandidateStatus): string {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatAdded(iso: string): string {
  const d = fromIsoUtc(iso);
  if (!d) return "—";
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  const date = d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${date}, ${time}`;
}

/* Header controls */
