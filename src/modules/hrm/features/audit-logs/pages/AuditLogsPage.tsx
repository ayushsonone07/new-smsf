import { useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  FileSearch,
  Filter,
  RefreshCw,
  ScrollText,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { useAuth } from "@features/auth";
import { useToast } from "@shared/components/feedback";
import { useDebouncedValue } from "@shared/hooks";
import { getApiErrorMessage } from "@shared/lib";
import {
  Card,
  Dialog,
  EmptyState,
  ErrorDisplay,
  PageHeader,
  TableSkeleton,
} from "@shared/components/ui";

import { auditLogKeys, useAuditLogs } from "../hooks";

import type { AuditAction, AuditLogListParams, AuditLogRecord } from "../types";

const PAGE_SIZES = [10, 20, 50, 100];

const ACTION_OPTIONS: { value: AuditAction | ""; label: string }[] = [
  { value: "", label: "All actions" },
  { value: "CREATE", label: "Create" },
  { value: "UPDATE", label: "Update" },
  { value: "DELETE", label: "Delete" },
  { value: "LOGIN", label: "Login" },
  { value: "LOGOUT", label: "Logout" },
  { value: "FAILED_LOGIN", label: "Failed login" },
  { value: "PASSWORD_CHANGE", label: "Password change" },
  { value: "CHECK_IN", label: "Check-in" },
  { value: "CHECK_OUT", label: "Check-out" },
  { value: "APPLY_LEAVE", label: "Apply leave" },
  { value: "APPROVE", label: "Approve" },
  { value: "REJECT", label: "Reject" },
  { value: "CANCEL", label: "Cancel" },
  { value: "CHANGE_ROLE", label: "Change role" },
  { value: "CHANGE_PERMISSION", label: "Change permission" },
  { value: "GENERATE", label: "Generate" },
  { value: "PROCESS", label: "Process" },
  { value: "PAY", label: "Pay" },
  { value: "EXPORT", label: "Export" },
];

export function AuditLogsPage() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();

  const [action, setAction] = useState<AuditAction | "">("");
  const [entityType, setEntityType] = useState("");
  const [username, setUsername] = useState("");
  const [successFilter, setSuccessFilter] = useState<"" | "true" | "false">("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [selected, setSelected] = useState<AuditLogRecord | null>(null);

  const debouncedEntity = useDebouncedValue(entityType.trim(), 350);
  const debouncedUsername = useDebouncedValue(username.trim(), 350);

  const params: AuditLogListParams = {
    page,
    size: pageSize,
    sort: "createdAt,desc",
  };
  if (action) params.action = action;
  if (debouncedEntity) params.entityType = debouncedEntity;
  if (debouncedUsername) params.username = debouncedUsername;
  if (successFilter !== "") params.success = successFilter === "true";
  if (fromDate) params.fromDate = `${fromDate}T00:00:00`;
  if (toDate) params.toDate = `${toDate}T23:59:59`;

  const auditLogs = useAuditLogs(params);
  const items = auditLogs.data?.items ?? [];
  const meta = auditLogs.data?.meta;
  const total = meta?.totalElements ?? 0;
  const totalPages = meta?.totalPages ?? 0;
  const hasNext = meta?.hasNext ?? false;

  if (role !== "ADMIN") {
    return (
      <ErrorDisplay message="You need administrator access to view audit logs." />
    );
  }

  function resetFilters() {
    setAction("");
    setEntityType("");
    setUsername("");
    setSuccessFilter("");
    setFromDate("");
    setToDate("");
    setPage(0);
  }

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: auditLogKeys.all });
    toast.success("Audit logs refreshed", "Latest activity was loaded.");
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <PageHeader
        eyebrow="Administration"
        title="Audit Logs"
        description="A tamper-resistant trail of sensitive system actions, logins, and changes."
        actions={
          <button
            type="button"
            onClick={refresh}
            disabled={auditLogs.isFetching}
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-card-foreground shadow transition-all hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={16} className={auditLogs.isFetching ? "animate-spin" : undefined} />
            Refresh
          </button>
        }
      />

      <Card padding="md">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative block w-full sm:w-52">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={action}
              onChange={(event) => {
                setAction(event.target.value as AuditAction | "");
                setPage(0);
              }}
              aria-label="Filter by action"
              className="h-10 w-full appearance-none rounded-lg border border-border bg-card pl-9 pr-3 text-sm font-medium text-card-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {ACTION_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <input
            value={entityType}
            onChange={(event) => {
              setEntityType(event.target.value);
              setPage(0);
            }}
            placeholder="Entity type (e.g. Employee, Payroll)"
            aria-label="Filter by entity type"
            className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm font-medium text-card-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-64"
          />

          <input
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              setPage(0);
            }}
            placeholder="User email"
            aria-label="Filter by user email"
            className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm font-medium text-card-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-56"
          />

          <select
            value={successFilter}
            onChange={(event) => {
              setSuccessFilter(event.target.value as "" | "true" | "false");
              setPage(0);
            }}
            aria-label="Filter by status"
            className="h-10 w-full cursor-pointer rounded-lg border border-border bg-card px-3 text-sm font-semibold text-card-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-36"
          >
            <option value="">All results</option>
            <option value="true">Succeeded</option>
            <option value="false">Failed</option>
          </select>

          <input
            type="date"
            value={fromDate}
            onChange={(event) => {
              setFromDate(event.target.value);
              setPage(0);
            }}
            aria-label="From date"
            className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm font-medium text-card-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-40"
          />

          <input
            type="date"
            value={toDate}
            onChange={(event) => {
              setToDate(event.target.value);
              setPage(0);
            }}
            min={fromDate || undefined}
            aria-label="To date"
            className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm font-medium text-card-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-40"
          />

          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-muted-foreground shadow transition-all hover:bg-surface-hover"
          >
            Clear
          </button>
        </div>
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <ScrollText size={13} />
          Newest entries first. Sensitive values (passwords, tokens, secrets) are redacted by the server.
        </p>
      </Card>

      <Card padding="none" className="overflow-hidden">
        {auditLogs.isLoading ? (
          <div className="p-5">
            <TableSkeleton rows={8} />
          </div>
        ) : auditLogs.error ? (
          <div className="p-10">
            <ErrorDisplay message={getApiErrorMessage(auditLogs.error, "Failed to load audit logs.")} />
          </div>
        ) : items.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={FileSearch}
              title="No audit events"
              description="No activity matches the current filters."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">HTTP</th>
                  <th className="px-4 py-3">IP address</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((record) => (
                  <tr key={record.id} className="transition-colors hover:bg-surface-hover">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {record.createdAt ? formatDateTime(record.createdAt) : "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <ActionBadge action={record.action} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-card-foreground">{record.username ?? "System"}</p>
                      <p className="text-xs text-muted-foreground">
                        {record.role ? formatRole(record.role) : ""}
                        {record.userId ? ` · #${record.userId}` : ""}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {record.entityType ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 font-mono text-xs font-semibold text-card-foreground">
                          {record.entityType}
                          {record.entityId ? ` · #${record.entityId}` : ""}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      <span className="font-mono text-xs">{record.httpMethod ?? "-"}</span>
                      <span className="block max-w-[160px] truncate text-xs" title={record.endpoint ?? undefined}>
                        {record.endpoint ?? ""}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                      {record.ipAddress ?? "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          record.success
                            ? "border-success/30 bg-success-soft text-success"
                            : "border-danger/30 bg-danger-soft text-danger"
                        }`}
                      >
                        {record.success ? "Success" : "Failed"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(record)}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-primary/30 bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
                      >
                        <ScrollText size={13} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <PaginationFooter
        page={page}
        pageSize={pageSize}
        total={total}
        totalPages={totalPages}
        hasNext={hasNext}
        isLoading={auditLogs.isFetching}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(0);
        }}
      />

      <AuditDetailDialog record={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

const ACTION_TONES: Record<AuditAction, string> = {
  CREATE: "border-success/30 bg-success-soft text-success",
  UPDATE: "border-info/30 bg-info-soft text-info",
  DELETE: "border-danger/30 bg-danger-soft text-danger",
  LOGIN: "border-primary/30 bg-primary-soft text-primary",
  LOGOUT: "border-border bg-surface-muted text-muted-foreground",
  FAILED_LOGIN: "border-danger/30 bg-danger-soft text-danger",
  PASSWORD_CHANGE: "border-warning/30 bg-warning-soft text-warning",
  CHECK_IN: "border-success/30 bg-success-soft text-success",
  CHECK_OUT: "border-info/30 bg-info-soft text-info",
  APPLY_LEAVE: "border-primary/30 bg-primary-soft text-primary",
  APPROVE: "border-success/30 bg-success-soft text-success",
  REJECT: "border-danger/30 bg-danger-soft text-danger",
  CANCEL: "border-warning/30 bg-warning-soft text-warning",
  CHANGE_ROLE: "border-warning/30 bg-warning-soft text-warning",
  CHANGE_PERMISSION: "border-warning/30 bg-warning-soft text-warning",
  GENERATE: "border-primary/30 bg-primary-soft text-primary",
  PROCESS: "border-info/30 bg-info-soft text-info",
  PAY: "border-success/30 bg-success-soft text-success",
  EXPORT: "border-border bg-surface-muted text-muted-foreground",
};

function ActionBadge({ action }: { action: AuditAction }) {
  const tone = ACTION_TONES[action] ?? "border-border bg-surface-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${tone}`}>
      {formatAction(action)}
    </span>
  );
}

function AuditDetailDialog({ record, onClose }: { record: AuditLogRecord | null; onClose: () => void }) {
  return (
    <Dialog
      open={Boolean(record)}
      onClose={onClose}
      title={record ? `Audit event #${record.id}` : ""}
      description={record ? `${formatAction(record.action)}${record.entityType ? ` · ${record.entityType}` : ""}` : ""}
      size="lg"
    >
      {record ? (
        <div className="space-y-5">
          <dl className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-card p-4 text-sm sm:grid-cols-3">
            {record.username ? <DetailItem label="User" value={record.username} /> : null}
            {record.role ? <DetailItem label="Role" value={formatRole(record.role)} /> : null}
            {record.userId ? <DetailItem label="User ID" value={String(record.userId)} /> : null}
            {record.createdAt ? <DetailItem label="Time" value={formatDateTime(record.createdAt)} /> : null}
            {record.ipAddress ? <DetailItem label="IP address" value={record.ipAddress} mono /> : null}
            <DetailItem label="HTTP" value={`${record.httpMethod ?? "-"} ${record.endpoint ?? ""}`} mono />
            {record.entityId ? <DetailItem label="Entity ID" value={String(record.entityId)} /> : null}
            <div>
              <dd className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</dd>
              <dt className="mt-1 font-bold text-card-foreground">{record.success ? "Success" : "Failed"}</dt>
            </div>
          </dl>

          {record.oldValue ? <JsonBlock title="Old value" json={record.oldValue} /> : null}
          {record.newValue ? <JsonBlock title="New value" json={record.newValue} /> : null}
          {record.details ? (
            <div>
              <p className="mb-1.5 text-sm font-semibold text-card-foreground">Details</p>
              <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-surface-muted p-4 font-mono text-xs leading-relaxed text-card-foreground">
                {record.details}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </Dialog>
  );
}

function DetailItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dd className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dd>
      <dt className={`mt-1 truncate font-semibold text-card-foreground ${mono ? "font-mono text-xs" : ""}`} title={value}>
        {value}
      </dt>
    </div>
  );
}

function JsonBlock({ title, json }: { title?: string; json?: string | null }) {
  if (!json) return null;
  let rendered = json;
  try {
    rendered = JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    // keep raw string when it isn't valid JSON
  }
  return (
    <div>
      {title ? <p className="mb-1.5 text-sm font-semibold text-card-foreground">{title}</p> : null}
      <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-surface-muted p-4 font-mono text-xs leading-relaxed text-card-foreground">
        {rendered}
      </pre>
    </div>
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
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm shadow sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4 text-muted-foreground">
        <span>
          Showing {start}–{end} of {total.toLocaleString()} events
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Per page:</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="rounded-lg border border-border bg-background px-2 py-1 text-xs font-medium text-foreground"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page === 0 || isLoading}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowLeft size={14} />
          Previous
        </button>
        <span className="px-1 text-xs text-muted-foreground">
          Page {totalPages === 0 ? 1 : page + 1} of {Math.max(totalPages, 1)}
        </span>
        <button
          type="button"
          disabled={!hasNext || isLoading}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

function formatAction(action: AuditAction) {
  return action.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatRole(role: string) {
  return role.replaceAll("_", " ").toUpperCase();
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}