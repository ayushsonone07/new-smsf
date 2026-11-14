import { useEffect, useMemo, useState, type FormEvent } from "react";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Edit3,
  HardDrive,
  Laptop,
  Loader2,
  Phone,
  RefreshCw,
  Search,
  Smartphone,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import { useToast } from "@shared/components/feedback";
import {
  AnimatedNumber,
  Card,
  Dialog,
  EmptyState,
  ErrorDisplay,
  PageHeader,
  TableSkeleton,
} from "@shared/components/ui";
import { useDebouncedValue } from "@shared/hooks";

import { useAppDispatch, useAppSelector } from "@hrm/app/store/hooks";
import {
  fetchEmployees,
  selectEmployees,
  selectEmployeesError,
  selectEmployeesLoading,
  selectEmployeesPagination,
  updateEmployee,
} from "@hrm/slices/employeeSlice";
import { getApiErrorMessage } from "@hrm/utils/apiError";

import type { EmployeeListItem } from "../types";

export function EmployeeAssetsPage() {
  const dispatch = useAppDispatch();
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "has_laptop" | "no_laptop" | "has_sim" | "no_sim">("all");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [refreshing, setRefreshing] = useState(false);

  // Edit / Assign Asset Modal State
  const [editingEmployee, setEditingEmployee] = useState<EmployeeListItem | null>(null);
  const [laptopType, setLaptopType] = useState("");
  const [laptopSerialNumber, setLaptopSerialNumber] = useState("");
  const [isCompanySim, setIsCompanySim] = useState(false);
  const [companyPhoneNumber, setCompanyPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 350);

  const items = useAppSelector(selectEmployees);
  const meta = useAppSelector(selectEmployeesPagination);
  const loading = useAppSelector(selectEmployeesLoading);
  const error = useAppSelector(selectEmployeesError);

  useEffect(() => {
    void dispatch(
      fetchEmployees({
        page,
        size: pageSize,
        q: debouncedSearch.trim() || undefined,
        status: "active",
        onboardingStatus: undefined,
        sort: undefined,
      }),
    );
  }, [dispatch, page, pageSize, debouncedSearch]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await dispatch(
        fetchEmployees({
          page,
          size: pageSize,
          q: debouncedSearch.trim() || undefined,
          status: "active",
          onboardingStatus: undefined,
          sort: undefined,
        }),
      ).unwrap();
      toast.success("Assets list refreshed", "Latest asset allocations loaded.");
    } catch (err) {
      toast.error("Couldn't refresh", getApiErrorMessage(err, "Failed to refresh list"));
    } finally {
      setRefreshing(false);
    }
  }

  function openEditModal(emp: EmployeeListItem) {
    setEditingEmployee(emp);
    setLaptopType(emp.laptopType ?? "");
    setLaptopSerialNumber(emp.laptopSerialNumber ?? "");
    setIsCompanySim(Boolean(emp.isCompanySim));
    setCompanyPhoneNumber(emp.companyPhoneNumber ?? "");
  }

  function closeEditModal() {
    setEditingEmployee(null);
  }

  async function handleSaveAssets(e: FormEvent) {
    e.preventDefault();
    if (!editingEmployee) return;

    setIsSubmitting(true);
    try {
      await dispatch(
        updateEmployee({
          id: editingEmployee.id,
          input: {
            laptopType: laptopType.trim() || null,
            laptopSerialNumber: laptopSerialNumber.trim() || null,
            isCompanySim,
            companyPhoneNumber: isCompanySim ? companyPhoneNumber.trim() || null : null,
          },
        }),
      ).unwrap();

      toast.success(
        "Assets updated",
        `Updated asset assignments for ${editingEmployee.name} (${editingEmployee.employeeCode}).`,
      );
      closeEditModal();
    } catch (err) {
      toast.error("Couldn't save assets", getApiErrorMessage(err, "Failed to save asset details"));
    } finally {
      setIsSubmitting(false);
    }
  }

  // Filter items in memory if search or asset filter is selected
  const filteredItems = useMemo(() => {
    return items.filter((emp) => {
      const hasLaptop = Boolean(emp.laptopSerialNumber || emp.laptopType);
      const hasSim = Boolean(emp.isCompanySim || emp.companyPhoneNumber);

      if (filterMode === "has_laptop" && !hasLaptop) return false;
      if (filterMode === "no_laptop" && hasLaptop) return false;
      if (filterMode === "has_sim" && !hasSim) return false;
      if (filterMode === "no_sim" && hasSim) return false;

      return true;
    });
  }, [items, filterMode]);

  // Overall counts for summary cards
  const stats = useMemo(() => {
    const total = meta?.totalElements ?? items.length;
    const laptopsAssigned = items.filter((e) => e.laptopSerialNumber || e.laptopType).length;
    const simsAssigned = items.filter((e) => e.isCompanySim || e.companyPhoneNumber).length;
    const bothAssigned = items.filter((e) => (e.laptopSerialNumber || e.laptopType) && (e.isCompanySim || e.companyPhoneNumber)).length;

    return { total, laptopsAssigned, simsAssigned, bothAssigned };
  }, [items, meta]);

  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Employees"
        title="Asset Management"
        description="Track, assign, and audit company assets (laptops, serial numbers, company SIM cards) for all active employees."
        actions={
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            aria-label="Refresh asset list"
            title="Refresh asset list"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow transition hover:bg-muted disabled:opacity-75"
          >
            <RefreshCw size={18} className={refreshing ? "animate-spin" : undefined} />
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-4 p-4 border border-border bg-card shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Employees</p>
            <p className="text-2xl font-bold text-foreground">
              <AnimatedNumber value={stats.total} />
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-4 border border-blue-500/20 bg-blue-500/5 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400">
            <Laptop size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Laptops Assigned
            </p>
            <p className="text-2xl font-bold text-foreground">
              <AnimatedNumber value={stats.laptopsAssigned} />
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-4 border border-emerald-500/20 bg-emerald-500/5 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <Smartphone size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Company SIMs Issued
            </p>
            <p className="text-2xl font-bold text-foreground">
              <AnimatedNumber value={stats.simsAssigned} />
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-4 border border-purple-500/20 bg-purple-500/5 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400">
            <Sparkles size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              Fully Equipped (Both)
            </p>
            <p className="text-2xl font-bold text-foreground">
              <AnimatedNumber value={stats.bothAssigned} />
            </p>
          </div>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-muted/40 p-4 lg:flex-row lg:items-center">
        <label className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={16}
          />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search employee name, code, serial number, SIM..."
            className="block h-10 w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground shadow placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </label>

        <div className="flex items-center gap-2">
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as any)}
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm text-foreground shadow focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          >
            <option value="all">All Assets</option>
            <option value="has_laptop">Laptop Assigned</option>
            <option value="no_laptop">Laptop Missing</option>
            <option value="has_sim">Company SIM Assigned</option>
            <option value="no_sim">No Company SIM</option>
          </select>
        </div>
      </div>

      {error ? (
        <ErrorDisplay message={error} />
      ) : null}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="py-3.5 pl-6 pr-4">Employee</th>
                <th className="px-4 py-3.5">Contact Details</th>
                <th className="px-4 py-3.5">Laptop Brand / Model</th>
                <th className="px-4 py-3.5">Laptop Serial Number</th>
                <th className="px-4 py-3.5">Company SIM Number</th>
                <th className="py-3.5 pl-4 pr-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6">
                    <TableSkeleton rows={5} />
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12">
                    <EmptyState
                      title="No asset records found"
                      description="No employees match your search or asset filter criteria."
                    />
                  </td>
                </tr>
              ) : (
                filteredItems.map((emp) => {
                  const hasLaptop = Boolean(emp.laptopSerialNumber || emp.laptopType);
                  const hasSim = Boolean(emp.isCompanySim || emp.companyPhoneNumber);

                  return (
                    <tr key={emp.id} className="transition-colors hover:bg-muted/40">
                      {/* Employee Details */}
                      <td className="py-4 pl-6 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary">
                            {emp.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{emp.name}</p>
                            <p className="text-xs text-muted-foreground">{emp.employeeCode}</p>
                          </div>
                        </div>
                      </td>

                      {/* Contact Details */}
                      <td className="px-4 py-4">
                        <div className="space-y-0.5 text-xs">
                          <p className="text-foreground truncate">{emp.email || "—"}</p>
                          <p className="text-muted-foreground">{emp.phone || "—"}</p>
                        </div>
                      </td>

                      {/* Laptop Brand */}
                      <td className="px-4 py-4">
                        {emp.laptopType ? (
                          <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-elevated px-2.5 py-1 text-xs font-semibold text-foreground">
                            <Laptop className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                            <span>{emp.laptopType}</span>
                          </div>
                        ) : (
                          <span className="text-xs italic text-muted-foreground">Not assigned</span>
                        )}
                      </td>

                      {/* Laptop Serial Number */}
                      <td className="px-4 py-4">
                        {emp.laptopSerialNumber ? (
                          <span className="inline-block rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-foreground">
                            {emp.laptopSerialNumber}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Company SIM */}
                      <td className="px-4 py-4">
                        {emp.isCompanySim || emp.companyPhoneNumber ? (
                          <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                            <Smartphone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>{emp.companyPhoneNumber || "Active SIM"}</span>
                          </div>
                        ) : (
                          <span className="text-xs italic text-muted-foreground">None</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-4 pl-4 pr-6 text-right">
                        <button
                          type="button"
                          onClick={() => openEditModal(emp)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow transition hover:bg-muted"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-primary" />
                          <span>Assign / Edit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <p className="text-xs text-muted-foreground">
            Page {page + 1} of {Math.max(1, totalPages)} ({stats.total} total employees)
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted disabled:opacity-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted disabled:opacity-50"
            >
              <span>Next</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit / Assign Assets Modal */}
      {editingEmployee && (
        <Dialog
          open={Boolean(editingEmployee)}
          onClose={closeEditModal}
          title={`Assign Assets — ${editingEmployee.name}`}
          size="md"
        >
          <form onSubmit={handleSaveAssets} className="space-y-4 p-6">
            <div className="rounded-xl border border-border bg-surface-muted/30 p-3 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Employee Code:</span>
                <span className="font-semibold text-foreground">{editingEmployee.employeeCode}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Personal Contact:</span>
                <span className="font-semibold text-foreground">{editingEmployee.phone || "—"}</span>
              </div>
            </div>

            {/* Laptop Brand / Model */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-foreground">
                Laptop Brand / Model
              </label>
              <input
                type="text"
                value={laptopType}
                onChange={(e) => setLaptopType(e.target.value)}
                placeholder="e.g. Dell Latitude 3420, Lenovo ThinkPad, HP..."
                className="block h-10 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground shadow focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>

            {/* Laptop Serial Number */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-foreground">
                Laptop Serial Number
              </label>
              <input
                type="text"
                value={laptopSerialNumber}
                onChange={(e) => setLaptopSerialNumber(e.target.value)}
                placeholder="e.g. SN-89472301"
                className="block h-10 w-full rounded-xl border border-border bg-card px-3 font-mono text-sm text-foreground shadow focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>

            {/* Company SIM Toggle & Number */}
            <div className="rounded-2xl border border-border bg-surface-muted/20 p-4 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isCompanySim}
                  onChange={(e) => setIsCompanySim(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                />
                <span className="text-sm font-semibold text-foreground">Company SIM Provided</span>
              </label>

              {isCompanySim && (
                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-medium text-muted-foreground">
                    Company Phone Number
                  </label>
                  <input
                    type="text"
                    value={companyPhoneNumber}
                    onChange={(e) => setCompanyPhoneNumber(e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    className="block h-10 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground shadow focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeEditModal}
                disabled={isSubmitting}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow transition hover:brightness-110 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Asset Details</span>
                )}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
