import { useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clipboard,
  Link2,
  Mail,
  RefreshCw,
  Search,
  UserCheck2,
  UserX2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useToast } from "@shared/components/feedback";
import {
  AnimatedFilterSelect,
  AnimatedNumber,
  Card,
  Dialog,
  EmptyState,
  ErrorDisplay,
  PageHeader,
  StaggerContainer,
  StaggerItem,
  TableSkeleton,
} from "@shared/components/ui";
import { useDebouncedValue } from "@shared/hooks";
import { getApiErrorMessage } from "@shared/lib";

import { hrService } from "../services";

import { OnboardingStatusBadge } from "./OnboardingStatusBadge";

import type { EmployeeListItem, OnboardingStatus } from "../types";

const STATUS_TABS: { value: "" | OnboardingStatus; label: string }[] = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Not Started" },
  { value: "LINK_SENT", label: "Awaiting Candidate" },
  { value: "DETAILS_SUBMITTED", label: "Pending Review" },
  { value: "VERIFIED", label: "Onboarded" },
];

const onboardingKeys = {
  all: ["hr", "onboarding"] as const,
  list: (params: Record<string, unknown>) => ["hr", "onboarding", "list", params] as const,
};

export function OnboardingPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState<"" | OnboardingStatus>("");
  const [search, setSearch] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function refreshOnboarding() {
    if (isRefreshing || listQuery.isFetching) return;
    setIsRefreshing(true);
    try {
      await listQuery.refetch();
      await qc.invalidateQueries({ queryKey: ["onboarding"] });
      toast.success("Refresh successfully");
    } catch (err) {
      toast.error("Couldn't refresh onboarding", getApiErrorMessage(err));
    } finally {
      setIsRefreshing(false);
    }
  }
  const debouncedSearch = useDebouncedValue(search, 350);
  const [generatedLink, setGeneratedLink] = useState<{
    employeeId: number;
    employeeName: string;
    formUrl: string;
    expiresAt: string;
  } | null>(null);

  const listParams = useMemo(
    () => ({
      q: debouncedSearch || undefined,
      onboardingStatus: status || undefined,
      page,
      size: pageSize,
      sort: "createdAt,desc",
    }),
    [debouncedSearch, status, page, pageSize],
  );

  const listQuery = useQuery({
    queryKey: onboardingKeys.list(listParams),
    queryFn: () => hrService.listEmployees(listParams),
  });

  const counts = [
    {
      label: "Not Started",
      tone: "text-slate-600",
      total: listQuery.data?.onboardingCounts.pending ?? null,
    },
    {
      label: "Awaiting Candidate",
      tone: "text-amber-600",
      total: listQuery.data?.onboardingCounts.linkSent ?? null,
    },
    {
      label: "Pending Review",
      tone: "text-sky-600",
      total: listQuery.data?.onboardingCounts.detailsSubmitted ?? null,
    },
    {
      label: "Onboarded",
      tone: "text-emerald-600",
      total: listQuery.data?.onboardingCounts.verified ?? null,
    },
  ] as const;

  const sendLink = useMutation({
    mutationFn: (employee: EmployeeListItem) => hrService.generateOnboardingLink(employee.id),
    onSuccess: (response, employee) => {
      setGeneratedLink({
        employeeId: employee.id,
        employeeName: employee.name,
        formUrl: response.formUrl,
        expiresAt: response.expiresAt,
      });
      void qc.invalidateQueries({ queryKey: onboardingKeys.all });
      toast.success("Onboarding form sent", `Link expires ${formatDateTime(response.expiresAt)}.`);
    },
    onError: (err) => toast.error("Couldn't send onboarding form", getApiErrorMessage(err)),
  });

  const verify = useMutation({
    mutationFn: (employee: EmployeeListItem) => hrService.verifyOnboarding(employee.id),
    onSuccess: (message) => {
      void qc.invalidateQueries({ queryKey: onboardingKeys.all });
      toast.success(message || "Onboarding verified");
    },
    onError: (err) => toast.error("Couldn't verify onboarding", getApiErrorMessage(err)),
  });

  const items = listQuery.data?.items ?? [];
  const meta = listQuery.data?.meta;
  const total = meta?.totalElements ?? 0;
  const totalPages = meta?.totalPages ?? 0;
  const hasNext = meta?.hasNext ?? false;

  function resetPage(next: () => void) {
    setPage(0);
    next();
  }

  return (
    <>
      <StaggerContainer className="space-y-6">
        <StaggerItem>
          <PageHeader
            title="Onboarding"
            description="Manage employee onboarding workflows, track progress, and verify documents."
          />
        </StaggerItem>

        <StaggerItem variant="card">
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {counts.map(({ label, tone, total: count }) => (
              <Card key={label}>
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <p className={`mt-2 text-3xl font-extrabold ${tone}`}>
                  <AnimatedNumber value={count ?? "—"} />
                </p>
              </Card>
            ))}
          </section>
        </StaggerItem>

        <StaggerItem variant="card">
          <Card padding="none">
            <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
              <label className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={16}
                />
                <input
                  value={search}
                  onChange={(event) => resetPage(() => setSearch(event.target.value))}
                  placeholder="Search name, email, employee code"
                  className="block w-full rounded-lg border border-border py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </label>

              <AnimatedFilterSelect
                value={status}
                onValueChange={(value) => resetPage(() => setStatus(value as "" | OnboardingStatus))}
                options={STATUS_TABS}
                ariaLabel="Filter employees by onboarding status"
                className="w-full sm:w-[220px]"
              />

              <RefreshIconButton
                refreshing={isRefreshing || listQuery.isFetching}
                onClick={() => void refreshOnboarding()}
              />
            </div>

            {listQuery.isLoading ? (
              <div className="p-4">
                <TableSkeleton rows={5} />
              </div>
            ) : listQuery.error ? (
              <div className="p-4">
                <ErrorDisplay message="Onboarding could not be loaded from the server." />
              </div>
            ) : items.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={UserX2}
                  title="No onboarding records found"
                  description="Employees with onboarding status matching this view will appear here."
                />
              </div>
            ) : (
              <OnboardingTable
                employees={items}
                sendingIds={sendLink.isPending ? [sendLink.variables?.id] : []}
                verifyingIds={verify.isPending ? [verify.variables?.id] : []}
                onOpen={(employeeId) => {
                  void navigate(`/hrm/employees/${employeeId}/onboarding`, {
                    state: { from: "/hrm/onboarding", label: "Back to onboarding" },
                  });
                }}
                onSend={(employee) => {
                  if (employee.onboardingStatus === "LINK_SENT") {
                    if (
                      !window.confirm(
                        "Resend the onboarding link? The old link will stop being useful.",
                      )
                    ) {
                      return;
                    }
                  }
                  sendLink.mutate(employee);
                }}
                onVerify={(employee) => {
                  if (window.confirm("Verify and complete onboarding for this employee?")) {
                    verify.mutate(employee);
                  }
                }}
              />
            )}

            <PaginationFooter
              page={page}
              pageSize={pageSize}
              total={total}
              totalPages={totalPages}
              hasNext={hasNext}
              isLoading={listQuery.isLoading}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(0);
              }}
            />
          </Card>
        </StaggerItem>
      </StaggerContainer>

      <LinkDialog
        link={generatedLink}
        onClose={() => setGeneratedLink(null)}
        onCopy={() => {
          if (!generatedLink) return;
          void navigator.clipboard.writeText(generatedLink.formUrl).then(
            () => toast.success("Link copied"),
            () => toast.error("Copy failed", "Select and copy the link manually."),
          );
        }}
      />
    </>
  );
}

function OnboardingTable({
  employees,
  sendingIds,
  verifyingIds,
  onOpen,
  onSend,
  onVerify,
}: {
  employees: EmployeeListItem[];
  sendingIds: (number | undefined)[];
  verifyingIds: (number | undefined)[];
  onOpen: (employeeId: number) => void;
  onSend: (employee: EmployeeListItem) => void;
  onVerify: (employee: EmployeeListItem) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-surface-muted text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Employee</th>
            <th className="px-4 py-3">Department</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Onboarded By</th>
            <th className="px-4 py-3">Onboarded On</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-surface-elevated">
          {employees.map((employee) => {
            const isSending = sendingIds.includes(employee.id);
            const isVerifying = verifyingIds.includes(employee.id);
            return (
              <tr key={employee.id} className="hover:bg-surface-hover/70">
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{employee.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {employee.employeeCode} | {employee.email}
                  </div>
                </td>
                <td className="px-4 py-3 text-foreground">
                  <div>{employee.departmentName ?? "Unassigned"}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {employee.designationName ?? "—"}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <OnboardingStatusBadge status={employee.onboardingStatus} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <UserCheck2 size={14} className="text-muted-foreground" />
                    {employee.onboardedByName ?? "—"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {employee.onboardedAt ? formatDate(employee.onboardedAt) : "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  {employee.onboardingStatus === "PENDING" ? (
                    <ActionButton
                      icon={<Mail size={14} />}
                      label="Send Form"
                      loading={isSending}
                      onClick={() => onSend(employee)}
                    />
                  ) : employee.onboardingStatus === "LINK_SENT" ? (
                    <ActionButton
                      icon={<RefreshCw size={14} />}
                      label="Resend"
                      loading={isSending}
                      onClick={() => onSend(employee)}
                    />
                  ) : employee.onboardingStatus === "DETAILS_SUBMITTED" ? (
                    <ActionButton
                      icon={<CheckCircle2 size={14} />}
                      label="Verify"
                      loading={isVerifying}
                      onClick={() => onVerify(employee)}
                    />
                  ) : (
                    <ActionButton
                      icon={<ArrowRight size={14} />}
                      label="View"
                      onClick={() => onOpen(employee.id)}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  loading = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary-soft px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary-soft/80 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? <RefreshCw size={14} className="animate-spin" /> : icon}
      {loading ? "Saving..." : label}
    </button>
  );
}

function LinkDialog({
  link,
  onClose,
  onCopy,
}: {
  link: {
    employeeId: number;
    employeeName: string;
    formUrl: string;
    expiresAt: string;
  } | null;
  onClose: () => void;
  onCopy: () => void;
}) {
  return (
    <Dialog
      open={!!link}
      onClose={onClose}
      title="Onboarding form link"
      description={
        link
          ? `Share this link with ${link.employeeName}. It expires ${formatDateTime(link.expiresAt)}.`
          : undefined
      }
    >
      {link ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-muted px-4 py-3">
            <Link2 size={16} className="shrink-0 text-primary" />
            <span className="min-w-0 break-all text-sm text-foreground">{link.formUrl}</span>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:brightness-110"
            >
              <Clipboard size={16} />
              Copy Link
            </button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}

function PaginationFooter({
  page,
  pageSize,
  total,
  totalPages,
  hasNext,
  isLoading,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const start = total === 0 ? 0 : page * pageSize + 1;
  const end = Math.min(total, (page + 1) * pageSize);

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4 text-muted-foreground">
        <span>
          Showing {start}–{end} of {total.toLocaleString()} employees
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-lg border border-border bg-surface-elevated px-2 py-1 text-xs font-medium text-foreground"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page === 0 || isLoading}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-elevated px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowLeft size={14} />
          Previous
        </button>
        <span className="px-2 text-sm text-muted-foreground">
          Page {page + 1} of {Math.max(totalPages, 1)}
        </span>
        <button
          type="button"
          disabled={!hasNext || isLoading}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-elevated px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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
      aria-label="Refresh onboarding"
      title="Refresh onboarding"
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface-elevated text-foreground transition-colors hover:border-border-strong hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
    >
      <RefreshCw size={17} className={refreshing ? "animate-spin" : ""} />
    </button>
  );
}
