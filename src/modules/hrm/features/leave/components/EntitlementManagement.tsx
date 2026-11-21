import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, RefreshCw, Trash2, Building2, Save, Users, Sparkles, Info, Search, ArrowLeft, ArrowRight } from "lucide-react";

import { useToast } from "@shared/components/feedback";
import { ConfirmDialog, EmptyState, StatusBadge } from "@shared/components/ui";
import { useDebouncedValue } from "@shared/hooks";
import type { PaginationMeta } from "@shared/types";
import { hrService } from "@features/hr";
import { useLeaveTypes } from "../hooks";
import { leaveService } from "../services/leaveService";
import { Select } from "@hrm/components/ui/select";
import { RefreshButton } from "@/components/ui/RefreshButton";

import type { LeaveEntitlement, LeaveTypeValue, LeavePolicyItem } from "../types";

const LEAVE_TYPE_OPTIONS: { value: LeaveTypeValue; label: string }[] = [
  { value: "CASUAL", label: "Casual Leave" },
  { value: "SICK", label: "Sick Leave" },
  { value: "PAID", label: "Paid Leave" },
  { value: "UNPAID", label: "Unpaid Leave" },
];

function getInitials(name?: string) {
  if (!name) return "EM";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getLeaveTypeBadge(type: string, label?: string) {
  const display = label || type;
  switch (type) {
    case "CASUAL":
      return <StatusBadge label={display} tone="emerald" dot={false} />;
    case "SICK":
      return <StatusBadge label={display} tone="rose" dot={false} />;
    case "PAID":
      return <StatusBadge label={display} tone="blue" dot={false} />;
    case "UNPAID":
    default:
      return <StatusBadge label={display} tone="slate" dot={false} />;
  }
}

export function EntitlementManagement() {
  const toast = useToast();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [employeeId, setEmployeeId] = useState<number | "ALL" | "">("");
  const [leaveType, setLeaveType] = useState<LeaveTypeValue>("CASUAL");
  const [totalDays, setTotalDays] = useState("12");
  const [entitlements, setEntitlements] = useState<LeaveEntitlement[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LeaveEntitlement | null>(null);

  // Company default policy state
  const [policies, setPolicies] = useState<{ [key in LeaveTypeValue]?: number }>({
    CASUAL: 12,
  });
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  // Table search, filter and backend pagination state
  const [tableSearch, setTableSearch] = useState("");
  const debouncedSearch = useDebouncedValue(tableSearch, 300);
  const [tableTypeFilter, setTableTypeFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);

  const totalPages = paginationMeta?.totalPages ?? 1;
  const totalElements = paginationMeta?.totalElements ?? 0;
  const start = totalElements === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(totalElements, currentPage * pageSize);

  const { data: leaveTypes } = useLeaveTypes();
  const { data: employeesData } = useQuery({
    queryKey: ["hr", "employees", "entitlements-selector"],
    queryFn: () => hrService.listEmployees({ page: 0, size: 200, status: "active", sort: "employeeCode,asc" }),
  });
  const employees = employeesData?.items ?? [];

  async function handleRefresh() {
    await Promise.all([loadEntitlements(), loadPolicies()]);
    toast.success("Refreshed successfully");
  }

  async function loadPolicies() {
    try {
      const data = await leaveService.getLeavePolicies();
      if (data && data.length > 0) {
        const map: { [key in LeaveTypeValue]?: number } = {};
        data.forEach((p) => {
          map[p.leaveType] = p.defaultDays;
        });
        setPolicies((prev) => ({ ...prev, ...map }));
      }
    } catch (e) {
      console.warn("Could not load leave policies:", e);
    }
  }

  async function handleSavePolicy(event: React.FormEvent) {
    event.preventDefault();
    setIsSavingPolicy(true);
    try {
      const payload: LeavePolicyItem[] = Object.entries(policies).map(([type, days]) => ({
        leaveType: type as LeaveTypeValue,
        defaultDays: Number(days) || 0,
      }));
      await leaveService.updateLeavePolicies(payload);
      toast.success("Company leave policy updated! All employees without custom overrides automatically inherit these leaves.");
    } catch {
      toast.error("Failed to update company leave policy");
    } finally {
      setIsSavingPolicy(false);
    }
  }

  async function handleSyncAll() {
    setIsSyncingAll(true);
    try {
      const res = await leaveService.syncPolicyToAllEmployees(year);
      toast.success(`Successfully assigned default policy leaves to all active employees for ${year}! (${res.count} employees updated)`);
      loadEntitlements();
    } catch {
      toast.error("Failed to sync leave policy to all employees");
    } finally {
      setIsSyncingAll(false);
    }
  }

  async function loadEntitlements() {
    setLoading(true);
    try {
      const res = await leaveService.listEntitlements({
        year,
        page: currentPage,
        size: pageSize,
        ...(tableTypeFilter !== "ALL" ? { leaveType: tableTypeFilter } : {}),
        ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
        sort: "id,desc",
      });
      setEntitlements(res.data);
      setPaginationMeta(res.meta);
    } catch {
      toast.error("Failed to load entitlements");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPolicies();
  }, []);

  useEffect(() => {
    void loadEntitlements();
  }, [year, currentPage, pageSize, tableTypeFilter, debouncedSearch]);

  async function handleSetEntitlement(event: React.FormEvent) {
    event.preventDefault();
    if (employeeId === "") {
      toast.error("Please select an employee or 'All Active Employees'");
      return;
    }
    try {
      const targetEmpId = employeeId === "ALL" ? null : (employeeId as number);
      await leaveService.setEntitlement({
        employeeId: targetEmpId,
        leaveType,
        totalDays: parseInt(totalDays, 10),
        year,
      });
      if (employeeId === "ALL") {
        toast.success(`Assigned ${totalDays} days of ${leaveType} to ALL active employees for ${year}`);
      } else {
        toast.success("Custom entitlement saved successfully");
      }
      loadEntitlements();
    } catch (error) {
      toast.error("Failed to save entitlement");
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      await leaveService.deleteEntitlement(id);
      toast.success("Entitlement deleted");
      loadEntitlements();
    } catch {
      toast.error("Failed to delete entitlement");
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* 1. COMPANY DEFAULT LEAVE POLICY CARD */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Building2 size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">Company Default Leave Policy</h2>
                <span className="inline-flex items-center rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-semibold text-primary ring-1 ring-inset ring-primary/20">
                  Global Rule
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Standard annual quotas inherited automatically by all employees and new joiners unless overridden.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSyncAll}
            disabled={isSyncingAll}
            className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-card px-3.5 text-xs font-semibold text-foreground shadow-xs transition-colors hover:bg-muted disabled:opacity-50"
          >
            <Sparkles size={14} className={isSyncingAll ? "animate-spin text-blue-600" : "text-blue-600"} />
            {isSyncingAll ? "Syncing..." : `Sync Policy to All (${year})`}
          </button>
        </div>

        <form onSubmit={handleSavePolicy} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-2 px-3 shadow-xs">
              <div className="text-xs">
                <p className="font-semibold text-foreground">Casual Leave</p>
                <p className="text-[11px] text-muted-foreground">Default quota</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={policies.CASUAL ?? 12}
                  onChange={(e) =>
                    setPolicies((prev) => ({
                      ...prev,
                      CASUAL: Number(e.target.value),
                    }))
                  }
                  className="h-9 w-20 rounded-lg border border-border bg-muted/30 px-2 text-center font-mono text-sm font-bold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  required
                />
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  days / year
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary-soft/60 px-3 py-2 text-xs text-foreground">
              <Info size={14} className="shrink-0 text-primary" />
              <span>1 paid casual leave / month (12 / year). Additional month leaves deducted in payroll.</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSavingPolicy}
            className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-xs transition-all hover:brightness-110 disabled:opacity-50"
          >
            <Save size={14} />
            {isSavingPolicy ? "Saving Policy..." : "Save Policy"}
          </button>
        </form>
      </section>

      {/* 2. SET SPECIFIC OR BULK ENTITLEMENTS */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-xs">
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users size={20} />
          </span>
          <div>
            <h2 className="text-base font-bold text-foreground">Custom & Bulk Entitlements</h2>
            <p className="text-xs text-muted-foreground">
              Select <strong>&quot;All Active Employees&quot;</strong> to apply in bulk, or pick a specific employee to override default leaves.
            </p>
          </div>
        </div>

        <form onSubmit={handleSetEntitlement} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 items-end">
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Target Employee</label>
            <Select
              value={employeeId}
              onChange={(event) => {
                const val = event.target.value;
                if (val === "ALL") setEmployeeId("ALL");
                else if (val === "") setEmployeeId("");
                else setEmployeeId(Number(val));
              }}
              required
              className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs font-medium text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select target</option>
              <option value="ALL">★ All Active Employees ({employees.length})</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employeeCode})
                </option>
              ))}
            </Select>
          </div>

          <div className="lg:col-span-3">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Leave Type</label>
            <Select
              value={leaveType}
              onChange={(event) => setLeaveType(event.target.value as LeaveTypeValue)}
              className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs font-medium text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {LEAVE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Total Days</label>
            <input
              type="number"
              value={totalDays}
              onChange={(event) => setTotalDays(event.target.value)}
              placeholder="12"
              min={0}
              required
              className="h-10 w-full rounded-xl border border-border bg-card px-3 font-mono text-xs font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Year</label>
            <input
              type="number"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              placeholder="2026"
              min={2020}
              max={2030}
              required
              className="h-10 w-full rounded-xl border border-border bg-card px-3 font-mono text-xs font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-xs transition-all hover:brightness-110 disabled:opacity-50"
            >
              {employeeId === "ALL" ? <Users size={15} /> : <Plus size={15} />}
              {employeeId === "ALL" ? "Assign to All" : "Set Entitlement"}
            </button>
          </div>
        </form>
      </section>

      {/* 3. ASSIGNED ENTITLEMENTS TABLE */}
      <section className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="font-bold text-foreground">Assigned Entitlements ({year})</h2>
            <p className="text-xs text-muted-foreground">List of saved entitlement entries in the database for {year}.</p>
          </div>
          <RefreshButton
            onRefresh={handleRefresh}
            isRefreshing={loading}
            label="entitlements"
          />
        </div>

        {/* Filter & Search Bar */}
        <div className="border-b border-border bg-muted/20 p-3 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative min-w-0 flex-1 max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={tableSearch}
                onChange={(e) => {
                  setTableSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by employee name or code..."
                className="h-9 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-xs font-medium text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={tableTypeFilter}
                onChange={(e) => {
                  setTableTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 rounded-xl border border-border bg-card px-3 text-xs font-medium text-foreground outline-none focus:border-primary"
              >
                <option value="ALL">All Leave Types</option>
                {LEAVE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {loading && entitlements.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading entitlements...</div>
        ) : totalElements === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Users}
              title={debouncedSearch || tableTypeFilter !== "ALL" ? "No matching entitlements" : "No custom overrides"}
              description={
                debouncedSearch || tableTypeFilter !== "ALL"
                  ? `No entitlements found matching "${tableSearch}".`
                  : "All employees are currently using the Company Default Leave Policy (12 Casual leaves/year)."
              }
            />
          </div>
        ) : (
          <div
            className={`overflow-x-auto transition-opacity ${loading ? "pointer-events-none opacity-60" : ""}`}
            aria-busy={loading}
          >
            <table className="min-w-[700px] w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3">Employee</th>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Leave Type</th>
                  <th className="px-5 py-3 text-center">Total Days</th>
                  <th className="px-5 py-3 text-center">Year</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entitlements.map((ent) => {
                  const typeLabel = leaveTypes?.find((t) => t.type === ent.leaveType)?.label ?? ent.leaveType;
                  return (
                    <tr key={ent.id} className="transition-colors hover:bg-muted/40">
                      <td className="whitespace-nowrap px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                            {getInitials(ent.employeeName)}
                          </span>
                          <span className="font-semibold text-foreground">{ent.employeeName ?? "—"}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-medium text-foreground">
                          {ent.employeeCode ?? "—"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        {getLeaveTypeBadge(ent.leaveType, typeLabel)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-center">
                        <span className="font-mono text-sm font-bold text-foreground">{ent.totalDays}</span>
                        <span className="ml-1 text-xs text-muted-foreground">days</span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-center text-xs text-muted-foreground font-mono">
                        {ent.year}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(ent)}
                          disabled={deletingId === ent.id}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-transparent bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger transition-colors hover:border-danger/30 hover:bg-danger/20 disabled:opacity-50"
                        >
                          <Trash2 size={12} />
                          {deletingId === ent.id ? "Deleting..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalElements > 0 && (
          <div className="flex flex-col gap-3 border-t border-border px-5 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              <span>
                Showing <strong>{start}</strong>–<strong>{end}</strong> of{" "}
                <strong>{totalElements.toLocaleString()}</strong> {totalElements === 1 ? "entry" : "entries"}
              </span>
              <div className="flex items-center gap-2">
                <span>Per page:</span>
                <Select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-border bg-card px-2 py-1 text-xs font-medium text-foreground"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                type="button"
                disabled={currentPage <= 1 || loading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowLeft size={13} />
                Previous
              </button>
              {getPageNumbers(currentPage, totalPages).map((item, idx) =>
                item === "ellipsis" ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground">
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    disabled={loading}
                    onClick={() => setCurrentPage(item)}
                    className={`grid h-7 min-w-[28px] place-items-center rounded-lg text-xs font-medium transition-colors ${
                      item === currentPage
                        ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                        : "border border-border bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
              <button
                type="button"
                disabled={currentPage >= totalPages || loading}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete entitlement?"
        description={
          deleteTarget
            ? `Are you sure you want to delete the ${leaveTypes?.find((t) => t.type === deleteTarget.leaveType)?.label ?? deleteTarget.leaveType} entitlement for ${deleteTarget.employeeName ?? deleteTarget.employeeCode ?? "this employee"}? This action cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        loading={deletingId !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
      />
    </div>
  );
}

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];

  if (current > 3) {
    pages.push("ellipsis");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push("ellipsis");
  }

  pages.push(total);

  return pages;
}
