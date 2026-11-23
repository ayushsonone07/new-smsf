import { useEffect, useMemo, useState, type FormEvent } from "react";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Contact,
  CreditCard,
  Edit3,
  HardDrive,
  Laptop,
  Loader2,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Undo2,
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

function formatLastSeen(dateStr: string | null | undefined): { label: string; isRecent: boolean; daysInactive: number } {
  if (!dateStr) return { label: "Never logged in", isRecent: false, daysInactive: 999 };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { label: "Unknown", isRecent: false, daysInactive: 999 };

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 24) {
    return {
      label: `Today (${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`,
      isRecent: true,
      daysInactive: 0,
    };
  } else if (diffDays === 1) {
    return { label: "Yesterday", isRecent: true, daysInactive: 1 };
  } else if (diffDays <= 7) {
    return { label: `${diffDays} days ago`, isRecent: true, daysInactive: diffDays };
  } else {
    return { label: `${diffDays} days ago`, isRecent: false, daysInactive: diffDays };
  }
}

export function EmployeeAssetsPage() {
  const dispatch = useAppDispatch();
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<
    | "all"
    | "laptop_working"
    | "laptop_idle"
    | "laptop_damaged"
    | "has_laptop"
    | "no_laptop"
    | "has_sim"
    | "no_sim"
    | "has_id_card"
    | "has_visiting_card"
  >("all");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [refreshing, setRefreshing] = useState(false);

  // Edit / Assign Asset Modal State
  const [editingEmployee, setEditingEmployee] = useState<EmployeeListItem | null>(null);
  const [laptopType, setLaptopType] = useState("");
  const [laptopSerialNumber, setLaptopSerialNumber] = useState("");
  const [laptopStatus, setLaptopStatus] = useState<"WORKING" | "DAMAGED">("WORKING");
  const [isCompanySim, setIsCompanySim] = useState(false);
  const [companyPhoneNumber, setCompanyPhoneNumber] = useState("");
  const [isIdCard, setIsIdCard] = useState(false);
  const [isVisitingCard, setIsVisitingCard] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [returningId, setReturningId] = useState<number | null>(null);

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
          force: true,
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
    setLaptopStatus(emp.laptopStatus === "DAMAGED" ? "DAMAGED" : "WORKING");
    setIsCompanySim(Boolean(emp.isCompanySim));
    setCompanyPhoneNumber(emp.companyPhoneNumber ?? "");
    setIsIdCard(Boolean(emp.isIdCard));
    setIsVisitingCard(Boolean(emp.isVisitingCard));
  }

  function closeEditModal() {
    setEditingEmployee(null);
  }

  async function handleSaveAssets(e: FormEvent) {
    e.preventDefault();
    if (!editingEmployee) return;

    setIsSubmitting(true);
    try {
      const cleanSerial = laptopSerialNumber.trim();
      await dispatch(
        updateEmployee({
          id: editingEmployee.id,
          input: {
            laptopType: laptopType.trim() || null,
            laptopSerialNumber: cleanSerial || null,
            laptopStatus: cleanSerial ? laptopStatus : null,
            isCompanySim,
            companyPhoneNumber: isCompanySim ? companyPhoneNumber.trim() || null : null,
            isIdCard,
            idCardNumber: null,
            isVisitingCard,
            visitingCardNumber: null,
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

  async function handleReturnLaptop(emp: EmployeeListItem) {
    const confirmReturn = window.confirm(
      `Confirm returning laptop (${emp.laptopType || "Device"} - ${emp.laptopSerialNumber}) from ${emp.name} to office stock?`,
    );
    if (!confirmReturn) return;

    setReturningId(emp.id);
    try {
      await dispatch(
        updateEmployee({
          id: emp.id,
          input: {
            laptopType: null,
            laptopSerialNumber: null,
            laptopStatus: null,
            isCompanySim: emp.isCompanySim,
            companyPhoneNumber: emp.companyPhoneNumber,
            isIdCard: emp.isIdCard,
            idCardNumber: null,
            isVisitingCard: emp.isVisitingCard,
            visitingCardNumber: null,
          },
        }),
      ).unwrap();

      toast.success(
        "Laptop returned to stock",
        `Laptop successfully returned from ${emp.name} and is now available in office stock.`,
      );
    } catch (err) {
      toast.error("Couldn't return laptop", getApiErrorMessage(err, "Failed to return laptop"));
    } finally {
      setReturningId(null);
    }
  }

  // Filter items in memory if search or asset filter is selected
  const filteredItems = useMemo(() => {
    return items.filter((emp) => {
      const hasLaptop = Boolean(emp.laptopSerialNumber || emp.laptopType);
      const isWorking = hasLaptop && emp.laptopStatus === "WORKING";
      const isIdle = hasLaptop && emp.laptopStatus === "IDLE";
      const isDamaged = hasLaptop && emp.laptopStatus === "DAMAGED";
      const hasSim = Boolean(emp.isCompanySim || emp.companyPhoneNumber);
      const hasIdCard = Boolean(emp.isIdCard);
      const hasVisitingCard = Boolean(emp.isVisitingCard);

      if (filterMode === "laptop_working" && !isWorking) return false;
      if (filterMode === "laptop_idle" && !isIdle) return false;
      if (filterMode === "laptop_damaged" && !isDamaged) return false;
      if (filterMode === "has_laptop" && !hasLaptop) return false;
      if (filterMode === "no_laptop" && hasLaptop) return false;
      if (filterMode === "has_sim" && !hasSim) return false;
      if (filterMode === "no_sim" && hasSim) return false;
      if (filterMode === "has_id_card" && !hasIdCard) return false;
      if (filterMode === "has_visiting_card" && !hasVisitingCard) return false;

      return true;
    });
  }, [items, filterMode]);

  // Overall counts for summary cards
  const stats = useMemo(() => {
    const total = meta?.totalElements ?? items.length;
    const laptopsAssigned = items.filter((e) => e.laptopSerialNumber || e.laptopType).length;
    const laptopsWorking = items.filter((e) => (e.laptopSerialNumber || e.laptopType) && e.laptopStatus === "WORKING").length;
    const laptopsIdle = items.filter((e) => (e.laptopSerialNumber || e.laptopType) && e.laptopStatus === "IDLE").length;
    const laptopsDamaged = items.filter((e) => (e.laptopSerialNumber || e.laptopType) && e.laptopStatus === "DAMAGED").length;
    const simsAssigned = items.filter((e) => e.isCompanySim || e.companyPhoneNumber).length;
    const bothAssigned = items.filter((e) => (e.laptopSerialNumber || e.laptopType) && (e.isCompanySim || e.companyPhoneNumber)).length;

    return { total, laptopsAssigned, laptopsWorking, laptopsIdle, laptopsDamaged, simsAssigned, bothAssigned };
  }, [items, meta]);

  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="flex items-center gap-4 p-4 border border-border bg-card shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users size={22} />
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
            <Laptop size={22} />
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
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Working / In Use
            </p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              <AnimatedNumber value={stats.laptopsWorking} />
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-4 border border-amber-500/20 bg-amber-500/5 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Idle / Not in Use
            </p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              <AnimatedNumber value={stats.laptopsIdle} />
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-4 border border-purple-500/20 bg-purple-500/5 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400">
            <Smartphone size={22} />
          </div>
          <div>
            <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              Company SIMs
            </p>
            <p className="text-2xl font-bold text-foreground">
              <AnimatedNumber value={stats.simsAssigned} />
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
            <option value="laptop_working">🟢 Laptops Working (In Active Use)</option>
            <option value="laptop_idle">🟡 Laptops Idle (Inactive 7+ Days)</option>
            <option value="laptop_damaged">🔴 Laptops Damaged / Needs Repair</option>
            <option value="has_laptop">All Laptops Assigned</option>
            <option value="no_laptop">No Laptop Assigned</option>
            <option value="has_sim">Company SIM Assigned</option>
            <option value="no_sim">No Company SIM</option>
            <option value="has_id_card">ID Card Issued</option>
            <option value="has_visiting_card">Visiting Card Issued</option>
          </select>

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
        </div>
      </div>

      {error ? (
        <ErrorDisplay message={error} />
      ) : null}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="py-3.5 pl-6 pr-4 whitespace-nowrap text-left">Employee</th>
                <th className="px-4 py-3.5 whitespace-nowrap text-left">Laptop Details</th>
                <th className="px-4 py-3.5 whitespace-nowrap text-left">Condition & Usage</th>
                <th className="px-4 py-3.5 whitespace-nowrap text-left">Physical Custody</th>
                <th className="px-4 py-3.5 whitespace-nowrap text-left">Company SIM</th>
                <th className="px-4 py-3.5 whitespace-nowrap text-left">Cards</th>
                <th className="py-3.5 pl-4 pr-6 text-right whitespace-nowrap">HR Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface-elevated text-sm">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6">
                    <TableSkeleton rows={5} />
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12">
                    <EmptyState
                      title="No asset records found"
                      description="No employees match your search or asset filter criteria."
                    />
                  </td>
                </tr>
              ) : (
                filteredItems.map((emp) => {
                  const hasLaptop = Boolean(emp.laptopSerialNumber || emp.laptopType);
                  const lastSeen = formatLastSeen(emp.lastLoginAt);

                  return (
                    <tr key={emp.id} className="transition-colors hover:bg-surface-hover/70">
                      {/* Employee Details */}
                      <td className="py-4 pl-6 pr-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary">
                            {emp.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground">{emp.name}</p>
                            <p className="text-xs text-muted-foreground">{emp.employeeCode}</p>
                            <p className="text-[11px] text-muted-foreground/80">{emp.departmentName || "General"}</p>
                          </div>
                        </div>
                      </td>

                      {/* Laptop Details (Model & Serial) */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        {hasLaptop ? (
                          <div className="space-y-1">
                            <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-muted/60 px-2.5 py-1 text-xs font-semibold text-foreground">
                              <Laptop className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                              <span>{emp.laptopType || "Office Laptop"}</span>
                            </div>
                            {emp.laptopSerialNumber ? (
                              <div className="text-[11px] font-mono text-muted-foreground">
                                S/N: <span className="font-semibold text-foreground">{emp.laptopSerialNumber}</span>
                              </div>
                            ) : null}
                            {emp.laptopAssignedDate ? (
                              <p className="text-[10px] text-muted-foreground">
                                Issued: {emp.laptopAssignedDate}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <span className="inline-flex items-center rounded-md border border-dashed border-border bg-surface-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                            ❌ No laptop assigned
                          </span>
                        )}
                      </td>

                      {/* Condition & Activity Status */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        {!hasLaptop ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : emp.laptopStatus === "DAMAGED" ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                              <ShieldAlert className="h-3 w-3 text-rose-600" />
                              Damaged / Faulty
                            </span>
                            <p className="text-[11px] text-rose-600/90 dark:text-rose-400">Under Repair</p>
                          </div>
                        ) : emp.laptopStatus === "WORKING" ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              🟢 Working / In Use
                            </span>
                            <p className="text-[11px] text-muted-foreground">
                              Active: <span className="font-medium text-foreground">{lastSeen.label}</span>
                            </p>
                          </div>
                        ) : (
                          /* IDLE / NOT IN USE */
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                              <Clock className="h-3 w-3 text-amber-600" />
                              🟡 Idle / Not in Use
                            </span>
                            <p className="text-[11px] text-amber-700/90 dark:text-amber-400 font-medium">
                              {lastSeen.daysInactive < 999
                                ? `Inactive for ${lastSeen.daysInactive} days`
                                : "No login recorded"}
                            </p>
                          </div>
                        )}
                      </td>

                      {/* Physical Custody */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        {hasLaptop ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                              <Users className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{emp.name}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              {emp.laptopStatus === "IDLE" ? (
                                <span className="text-amber-600 dark:text-amber-400 font-medium">In custody (idle/unreturned)</span>
                              ) : (
                                "Physical possession"
                              )}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Company SIM */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        {emp.isCompanySim || emp.companyPhoneNumber ? (
                          <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                            <Smartphone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>{emp.companyPhoneNumber || "Active SIM"}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </td>

                      {/* Cards */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {emp.isIdCard ? (
                            <span
                              title="ID Card Issued"
                              className="inline-flex items-center gap-1 rounded-md border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-[11px] font-semibold text-purple-700 dark:text-purple-300"
                            >
                              <CreditCard className="h-3 w-3" />
                              <span>ID</span>
                            </span>
                          ) : null}
                          {emp.isVisitingCard ? (
                            <span
                              title="Visiting Card Issued"
                              className="inline-flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300"
                            >
                              <Contact className="h-3 w-3" />
                              <span>Card</span>
                            </span>
                          ) : null}
                          {!emp.isIdCard && !emp.isVisitingCard ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : null}
                        </div>
                      </td>

                      {/* HR Quick Actions */}
                      <td className="py-4 pl-4 pr-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {hasLaptop ? (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditModal(emp)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-elevated px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition hover:border-primary/40 hover:bg-surface-hover"
                              >
                                <Edit3 className="h-3.5 w-3.5 text-primary" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleReturnLaptop(emp)}
                                disabled={returningId === emp.id}
                                title="Return laptop to office stock"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
                              >
                                {returningId === emp.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Undo2 className="h-3.5 w-3.5" />
                                )}
                                <span>Return to Office</span>
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openEditModal(emp)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:brightness-110"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>+ Assign Laptop</span>
                            </button>
                          )}
                        </div>
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
          title={`Asset Management — ${editingEmployee.name}`}
          size="md"
        >
          <form onSubmit={handleSaveAssets} className="space-y-4 p-6">
            <div className="rounded-xl border border-border bg-surface-muted/30 p-3 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Employee Code:</span>
                <span className="font-semibold text-foreground">{editingEmployee.employeeCode}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Department:</span>
                <span className="font-semibold text-foreground">{editingEmployee.departmentName || "General"}</span>
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

            {/* Laptop Hardware Condition */}
            {laptopSerialNumber.trim() ? (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  Laptop Hardware Condition
                </label>
                <select
                  value={laptopStatus}
                  onChange={(e) => setLaptopStatus(e.target.value as any)}
                  className="block h-10 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground shadow focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                >
                  <option value="WORKING">🟢 Working (In Active Use)</option>
                  <option value="DAMAGED">🔴 Damaged / Physical Fault (Under Repair)</option>
                </select>
              </div>
            ) : null}

            {/* Quick Unassign / Return from Modal */}
            {editingEmployee.laptopSerialNumber && (
              <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <div>
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                    Currently Assigned: {editingEmployee.laptopSerialNumber}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Click return to deposit this laptop back to office stock.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLaptopSerialNumber("");
                    setLaptopType("");
                  }}
                  className="rounded-lg border border-amber-500/30 bg-card px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 transition hover:bg-amber-500/10"
                >
                  Clear / Return
                </button>
              </div>
            )}

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

            {/* ID Card Toggle */}
            <div className="rounded-2xl border border-border bg-surface-muted/20 p-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isIdCard}
                  onChange={(e) => setIsIdCard(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                />
                <span className="text-sm font-semibold text-foreground">ID Card Issued (Yes / No)</span>
              </label>
            </div>

            {/* Visiting Card Toggle */}
            <div className="rounded-2xl border border-border bg-surface-muted/20 p-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isVisitingCard}
                  onChange={(e) => setIsVisitingCard(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                />
                <span className="text-sm font-semibold text-foreground">Visiting Card Issued (Yes / No)</span>
              </label>
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
