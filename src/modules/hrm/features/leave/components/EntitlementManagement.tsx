import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, RefreshCw, Trash2, Building2, Save, Users, Sparkles, Info, Search, ArrowLeft, ArrowRight } from "lucide-react";

import { useToast } from "@shared/components/feedback";
import { ConfirmDialog } from "@shared/components/ui";
import { useDebouncedValue } from "@shared/hooks";
import type { PaginationMeta } from "@shared/types";
import { hrService } from "@features/hr";
import { useLeaveTypes } from "../hooks";
import { leaveService } from "../services/leaveService";

import { Select } from "@hrm/components/ui/select";

import type { LeaveEntitlement, LeaveTypeValue, LeavePolicyItem } from "../types";

const LEAVE_TYPE_OPTIONS: { value: LeaveTypeValue; label: string }[] = [
  { value: "CASUAL", label: "Casual Leave" },
  { value: "SICK", label: "Sick Leave" },
  { value: "PAID", label: "Paid Leave" },
  { value: "UNPAID", label: "Unpaid Leave" },
];

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
    SICK: 12,
    PAID: 15,
    UNPAID: 0,
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
    <div className="space-y-6">
      {/* 1. COMPANY DEFAULT LEAVE POLICY CARD */}
      <section className="rounded-2xl border border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50/50 via-card to-card p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                <Building2 size={18} />
              </span>
              <h2 className="text-lg font-bold text-foreground">Company Default Leave Policy</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Define standard annual leave quotas for the whole company. Employees without custom overrides automatically inherit these leaves, including new joiners.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSyncAll}
            disabled={isSyncingAll}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-xs font-semibold text-secondary-foreground shadow-sm hover:bg-secondary/80 disabled:opacity-50"
          >
            <Sparkles size={14} className={isSyncingAll ? "animate-spin text-blue-600" : "text-blue-600"} />
            {isSyncingAll ? "Syncing..." : `Sync Policy to All (${year})`}
          </button>
        </div>

        <form onSubmit={handleSavePolicy} className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {LEAVE_TYPE_OPTIONS.map((opt) => (
              <div key={opt.value} className="rounded-xl border border-border bg-card p-3 shadow-xs">
                <label className="block text-xs font-semibold text-foreground mb-1">
                  {opt.label}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={365}
                    value={policies[opt.value] ?? 0}
                    onChange={(e) =>
                      setPolicies((prev) => ({
                        ...prev,
                        [opt.value]: Number(e.target.value),
                      }))
                    }
                    className="mbg-filter-control h-10 w-full rounded-lg border border-border bg-surface-elevated px-3 text-sm font-bold text-foreground outline-none focus:border-blue-500"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-muted-foreground pointer-events-none">
                    days/yr
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info size={14} className="text-blue-500 shrink-0" />
              <span>HR does not need to set leaves individually. Default quota is automatically assigned.</span>
            </div>
            <button
              type="submit"
              disabled={isSavingPolicy}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-xs font-bold text-white shadow hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={14} />
              {isSavingPolicy ? "Saving Policy..." : "Save Company Policy"}
            </button>
          </div>
        </form>
      </section>

      {/* 2. SET SPECIFIC OR BULK ENTITLEMENTS */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-foreground">Custom / Bulk Leave Entitlements</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Select <strong>&quot;All Active Employees&quot;</strong> to apply in bulk, or pick a specific employee to override default leaves.
            </p>
          </div>
        </div>

        <form onSubmit={handleSetEntitlement} className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <div className="col-span-2 lg:col-span-1">
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Target</label>
            <Select
              value={employeeId}
              onChange={(event) => {
                const val = event.target.value;
                if (val === "ALL") setEmployeeId("ALL");
                else if (val === "") setEmployeeId("");
                else setEmployeeId(Number(val));
              }}
              required
              className="h-10 w-full rounded-xl border border-border bg-surface-elevated px-3 text-xs font-medium text-foreground"
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
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Leave Type</label>
            <Select
              value={leaveType}
              onChange={(event) => setLeaveType(event.target.value as LeaveTypeValue)}
              className="h-10 w-full rounded-xl border border-border bg-surface-elevated px-3 text-xs font-medium text-foreground"
            >
              {LEAVE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Total Days</label>
            <input
              type="number"
              value={totalDays}
              onChange={(event) => setTotalDays(event.target.value)}
              placeholder="12"
              min={0}
              required
              className="mbg-filter-control h-10 w-full rounded-xl border border-border bg-surface-elevated px-3 text-xs font-medium text-foreground outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Year</label>
            <input
              type="number"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              placeholder="2026"
              min={2020}
              max={2030}
              required
              className="mbg-filter-control h-10 w-full rounded-xl border border-border bg-surface-elevated px-3 text-xs font-medium text-foreground outline-none"
            />
          </div>
          <div className="flex items-end col-span-2 lg:col-span-1">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
            >
              {employeeId === "ALL" ? <Users size={16} /> : <Plus size={16} />}
              {employeeId === "ALL" ? "Assign to All" : "Set Entitlement"}
            </button>
          </div>
        </form>
      </section>

      {/* 3. ASSIGNED ENTITLEMENTS TABLE */}
      <section className="rounded-2xl border border-border bg-card shadow">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="font-extrabold text-foreground">Assigned Entitlements ({year})</h2>
            <p className="text-xs text-muted-foreground">List of saved entitlement entries in the database for {year}.</p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            aria-label={loading ? "Refreshing entitlements" : "Refresh entitlements"}
            title="Refresh entitlements"
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-border bg-surface-elevated text-foreground shadow transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-70"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : undefined} />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="border-b border-border bg-surface-muted/30 p-3 sm:px-5">
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
                className="mbg-filter-control h-9 w-full rounded-xl border border-border bg-surface-elevated pl-9 pr-3 text-xs font-medium text-foreground outline-none placeholder:text-muted-foreground focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={tableTypeFilter}
                onChange={(e) => {
                  setTableTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 rounded-xl border border-border bg-surface-elevated px-3 text-xs font-medium text-foreground outline-none"
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
          <div className="p-8 text-center text-sm text-muted-foreground">
            {debouncedSearch || tableTypeFilter !== "ALL" ? (
              <>No matching entitlements found for &quot;{tableSearch}&quot;.</>
            ) : (
              <>No individual overrides found. All employees are automatically using the <strong>Company Default Leave Policy</strong> above!</>
            )}
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-[700px] w-full text-sm">
              <thead className="sticky top-0 bg-surface-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Employee</th>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Leave Type</th>
                  <th className="px-5 py-3">Total Days</th>
                  <th className="px-5 py-3">Year</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entitlements.map((ent) => (
                  <tr key={ent.id} className="hover:bg-muted/40">
                    <td className="px-5 py-3 font-semibold">{ent.employeeName ?? "—"}</td>
                    <td className="px-5 py-3 font-mono text-xs">{ent.employeeCode ?? "—"}</td>
                    <td className="px-5 py-3">{leaveTypes?.find((t) => t.type === ent.leaveType)?.label ?? ent.leaveType}</td>
                    <td className="px-5 py-3 font-mono">{ent.totalDays}</td>
                    <td className="px-5 py-3">{ent.year}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(ent)}
                        disabled={deletingId === ent.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-danger-soft px-2.5 py-1.5 text-xs font-bold text-danger hover:brightness-90 disabled:opacity-50"
                      >
                        <Trash2 size={12} /> {deletingId === ent.id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
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
                  className="rounded-lg border border-border bg-surface-elevated px-2 py-1 text-xs font-medium text-foreground"
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
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-elevated px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
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
                        ? "bg-primary text-primary-foreground shadow"
                        : "border border-border bg-surface-elevated text-foreground hover:bg-surface-hover"
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
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-elevated px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
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

