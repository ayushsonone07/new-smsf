import { useEffect, useRef, useState } from "react";

import { Check, ChevronDown, ChevronLeft } from "lucide-react";
import { createPortal } from "react-dom";

import { useToast } from "@shared/components/feedback";
import { getApiErrorMessage } from "@shared/lib";

import { useUpdateCandidateStatus } from "../hooks";

import type { CandidateStatus } from "../types";

/* ── status metadata (label + colours) ───────────────────── */

interface StatusMeta {
  label: string;
  /** Tailwind classes for the pill background / text / inset ring. */
  pill: string;
  /** Tailwind background colour for the small dot rendered in menu items. */
  dot: string;
}

/**
 * Single source of truth for status presentation. Keep keys in lock-step with
 * CANDIDATE_STATUSES in hr.types.ts — TS will yell if you forget.
 */
const STATUS_META: Record<CandidateStatus, StatusMeta> = {
  NEW: {
    label: "New",
    pill: "bg-sky-50 text-sky-700 ring-sky-100",
    dot: "bg-sky-500",
  },
  SHORTLISTED: {
    label: "Shortlisted",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  CONTACTED: {
    label: "Contacted",
    pill: "bg-indigo-50 text-indigo-700 ring-indigo-100",
    dot: "bg-indigo-500",
  },
  IN_PROCESS: {
    label: "In process",
    pill: "bg-violet-50 text-violet-700 ring-violet-100",
    dot: "bg-violet-500",
  },
  INTERVIEW: {
    label: "Interview",
    pill: "bg-amber-50 text-amber-700 ring-amber-100",
    dot: "bg-amber-500",
  },
  OFFERED: {
    label: "Offered",
    pill: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100",
    dot: "bg-fuchsia-500",
  },
  REQUEST_HIRING_APPROVAL: {
    label: "Request hiring approval",
    pill: "bg-cyan-50 text-cyan-700 ring-cyan-100",
    dot: "bg-cyan-500",
  },
  HIRED: {
    label: "Hired",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    dot: "bg-emerald-500",
  },
  REJECTED: {
    label: "Rejected",
    pill: "bg-rose-50 text-rose-700 ring-rose-100",
    dot: "bg-rose-500",
  },
  WITHDRAWN: {
    label: "Withdrawn",
    pill: "bg-slate-100 text-slate-600 ring-slate-200",
    dot: "bg-slate-400",
  },
  ON_HOLD: {
    label: "On hold",
    pill: "bg-orange-50 text-orange-700 ring-orange-100",
    dot: "bg-orange-500",
  },
};

const UNKNOWN_META: StatusMeta = {
  label: "—",
  pill: "bg-slate-100 text-slate-600 ring-slate-200",
  dot: "bg-slate-400",
};

/**
 * Visual grouping shown in the dropdown. Statuses inside a group are listed in
 * order; groups appear with a small caps header and a divider between them.
 * Editing this changes only the menu's appearance — the data layer is unaffected.
 */
const STATUS_GROUPS: { label: string; statuses: CandidateStatus[] }[] = [
  {
    label: "Active",
    statuses: ["NEW", "SHORTLISTED", "CONTACTED", "IN_PROCESS", "INTERVIEW", "OFFERED"],
  },
  { label: "Approval", statuses: ["REQUEST_HIRING_APPROVAL"] },
  { label: "Decided", statuses: ["HIRED", "REJECTED", "WITHDRAWN"] },
  { label: "Paused", statuses: ["ON_HOLD"] },
];

/**
 * Resolve display metadata for any backend status string. Unknown values get
 * a slate pill with the raw value title-cased so nothing is silently hidden.
 */
function getStatusMeta(status: string): StatusMeta {
  const key = status.toUpperCase() as CandidateStatus;
  const known = STATUS_META[key];
  if (known) return known;
  return { ...UNKNOWN_META, label: titleCase(status) };
}

function titleCase(s: string): string {
  if (!s) return UNKNOWN_META.label;
  return s
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => (w[0] ?? "").toUpperCase() + w.slice(1))
    .join(" ");
}

function isDecidedStatus(status: string): status is CandidateStatus {
  return ["HIRED", "REJECTED", "WITHDRAWN"].includes(status as CandidateStatus);
}

function isApprovalStatus(status: string): status is CandidateStatus {
  return status === "REQUEST_HIRING_APPROVAL";
}

function isActiveWorkflowStatus(status: string): status is CandidateStatus {
  return ["NEW", "SHORTLISTED", "CONTACTED", "IN_PROCESS", "INTERVIEW", "OFFERED"].includes(
    status as CandidateStatus,
  );
}

function isStatusChangeDisabled(currentStatus: string, nextStatus: CandidateStatus): boolean {
  const currentKey = currentStatus.toUpperCase();
  if (isDecidedStatus(currentKey)) return true;
  if (isApprovalStatus(currentKey)) return isDecidedStatus(nextStatus) || isActiveWorkflowStatus(nextStatus);
  if (isActiveWorkflowStatus(currentKey)) return isDecidedStatus(nextStatus);
  return false;
}

function isMenuDisabled(currentStatus: string): boolean {
  return isDecidedStatus(currentStatus.toUpperCase());
}

/* ── public: StatusPill (display only) ───────────────────── */

export function StatusPill({ status }: { status: string }) {
  const m = getStatusMeta(status);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${m.pill}`}
    >
      {m.label}
    </span>
  );
}

/* ── public: StatusMenu (interactive) ────────────────────── */

interface StatusMenuProps {
  candidateId: number;
  status: string;
}

/**
 * Click the pill → popover with all statuses. Selecting one fires
 * useUpdateCandidateStatus (optimistic). Toast surfaces success/error.
 */
export function StatusMenu({ candidateId, status }: StatusMenuProps) {
  const [open, setOpen] = useState(false);
  const [selectedGroupLabel, setSelectedGroupLabel] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPosition, setPopoverPosition] = useState({ left: 0, top: 0, opensAbove: false });
  const updateMut = useUpdateCandidateStatus();
  const toast = useToast();

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (!containerRef.current?.contains(target) && !popoverRef.current?.contains(target)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const menuWidth = 256;
      const estimatedMenuHeight = selectedGroupLabel ? 360 : 300;
      const opensAbove =
        window.innerHeight - rect.bottom < estimatedMenuHeight && rect.top > estimatedMenuHeight;
      const left = Math.max(
        12,
        Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12),
      );
      setPopoverPosition({
        left,
        top: opensAbove ? rect.top - 8 : rect.bottom + 8,
        opensAbove,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, selectedGroupLabel]);

  useEffect(() => {
    if (!open) setSelectedGroupLabel(null);
  }, [open]);

  const currentKey = status.toUpperCase();
  const currentMeta = getStatusMeta(status);
  const selectedGroup = STATUS_GROUPS.find((group) => group.label === selectedGroupLabel);

  function selectStatus(next: CandidateStatus) {
    setOpen(false);
    if (next === currentKey) return; // no-op when picking the same value
    if (isStatusChangeDisabled(currentKey, next)) return;
    updateMut.mutate(
      { id: candidateId, status: next },
      {
        onSuccess: (message) => toast.success(message || "Status updated"),
        onError: (err) => toast.error("Couldn’t update status", getApiErrorMessage(err)),
      },
    );
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (isMenuDisabled(currentKey)) return;
          setOpen((current) => !current);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`group inline-flex items-center gap-2 rounded-full py-1 pl-3 pr-1.5 text-xs font-semibold ring-1 ring-inset transition-all ${
          currentMeta.pill
        } ${isMenuDisabled(currentKey) ? "cursor-not-allowed opacity-60" : "hover:-translate-y-px hover:shadow-md"}`}
      >
        <span>{currentMeta.label}</span>
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/70 ring-1 ring-inset ring-black/[0.04]">
          <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open
        ? createPortal(
            <div
              ref={popoverRef}
              role="menu"
              aria-label="Change status"
              style={{
                left: popoverPosition.left,
                top: popoverPosition.top,
                transform: popoverPosition.opensAbove ? "translateY(-100%)" : undefined,
              }}
              className="mbg-popover-in fixed z-[70] w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/[0.04]"
            >
              <div className="border-b border-slate-100 px-4 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Change status
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Currently <span className="font-medium text-slate-600">{currentMeta.label}</span>
                </p>
              </div>

              {selectedGroup ? (
                <div className="py-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedGroupLabel(null)}
                    className="flex w-full items-center gap-1 px-4 py-2 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
                  >
                    <ChevronLeft size={15} />
                    All status groups
                  </button>
                  <p className="px-4 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {selectedGroup.label}
                  </p>
                  {selectedGroup.statuses
                    .filter((nextStatus) => nextStatus !== "NEW" || currentKey === "NEW")
                    .map((nextStatus) => {
                      const meta = STATUS_META[nextStatus];
                      const isCurrent = nextStatus === currentKey;
                      const disabled = isStatusChangeDisabled(currentKey, nextStatus);
                      return (
                        <button
                          key={nextStatus}
                          type="button"
                          role="menuitem"
                          onClick={() => selectStatus(nextStatus)}
                          disabled={disabled}
                          className={`flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors ${
                            isCurrent
                              ? "bg-indigo-50/60 text-slate-900"
                              : disabled
                              ? "text-slate-400"
                              : "text-slate-700 hover:bg-slate-50"
                          } ${disabled ? "cursor-not-allowed" : ""}`}
                        >
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white ${meta.dot}`}
                          />
                          <span className="flex-1 text-left font-medium">{meta.label}</span>
                          {isCurrent ? (
                            <span className="grid h-5 w-5 place-items-center rounded-full bg-indigo-600 text-white">
                              <Check size={12} strokeWidth={3} />
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {STATUS_GROUPS.map((group) => {
                    const hasCurrentStatus = group.statuses.includes(currentKey as CandidateStatus);
                    const groupMeta = group.statuses[0]
                      ? STATUS_META[group.statuses[0]]
                      : UNKNOWN_META;
                    return (
                      <button
                        key={group.label}
                        type="button"
                        role="menuitem"
                        onClick={() => setSelectedGroupLabel(group.label)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
                      >
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${groupMeta.dot}`} />
                        <span className="flex-1 text-sm font-semibold text-slate-700">
                          {group.label}
                        </span>
                        <span className="text-xs text-slate-400">
                          {hasCurrentStatus
                            ? currentMeta.label
                            : `${group.statuses.length} statuses`}
                        </span>
                        <ChevronDown size={15} className="-rotate-90 text-slate-400" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
