import type { OnboardingStatus } from "../types";

const STATUS_META: Record<OnboardingStatus, { label: string; classes: string }> = {
  PENDING: {
    label: "Not Started",
    classes: "bg-slate-100 text-slate-700 ring-slate-200",
  },
  LINK_SENT: {
    label: "Awaiting Candidate",
    classes: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  DETAILS_SUBMITTED: {
    label: "Pending Review",
    classes: "bg-sky-50 text-sky-700 ring-sky-200",
  },
  VERIFIED: {
    label: "Onboarded",
    classes: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
};

export function OnboardingStatusBadge({ status }: { status: OnboardingStatus }) {
  const meta: { label: string; classes: string } = STATUS_META[status] ?? STATUS_META.PENDING;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${meta.classes}`}
    >
      {meta.label}
    </span>
  );
}
