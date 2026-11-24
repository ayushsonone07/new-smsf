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
  History,
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

import { hrService } from "../services/hrService";
import type { EmployeeListItem, LaptopAssignmentHistory, SimAssignmentHistory } from "../types";

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
    | "sim_active"
    | "sim_idle"
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

  // Modern In-App Confirmation Modals
  const [transferModal, setTransferModal] = useState<{
    targetEmployee: EmployeeListItem;
    duplicateOwner: EmployeeListItem;
    cleanSerial: string;
    cleanType: string;
  } | null>(null);

  const [returnModalEmployee, setReturnModalEmployee] = useState<EmployeeListItem | null>(null);
  const [returnCondition, setReturnCondition] = useState<"WORKING" | "DAMAGED">("WORKING");
  const [returnRemarks, setReturnRemarks] = useState("");

  // SIM Transfer & Return Modals
  const [transferSimModal, setTransferSimModal] = useState<{
    targetEmployee: EmployeeListItem;
    duplicateOwner: EmployeeListItem;
    cleanPhone: string;
  } | null>(null);
  const [returnSimModalEmployee, setReturnSimModalEmployee] = useState<EmployeeListItem | null>(null);
  const [simReturnCondition, setSimReturnCondition] = useState<"ACTIVE" | "LOST" | "DAMAGED">("ACTIVE");
  const [simReturnRemarks, setSimReturnRemarks] = useState("");
  const [returningSimId, setReturningSimId] = useState<number | null>(null);

  // History & Audit Trail Modal State
  const [historyModalInfo, setHistoryModalInfo] = useState<{
    serialNumber: string;
    laptopType?: string | null;
  } | null>(null);
  const [historyList, setHistoryList] = useState<LaptopAssignmentHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // SIM History & Audit Trail Modal State
  const [simHistoryModalInfo, setSimHistoryModalInfo] = useState<{
    phoneNumber: string;
  } | null>(null);
  const [simHistoryList, setSimHistoryList] = useState<SimAssignmentHistory[]>([]);
  const [simHistoryLoading, setSimHistoryLoading] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 350);

  const items = useAppSelector(selectEmployees);
  const meta = useAppSelector(selectEmployeesPagination);
  const loading = useAppSelector(selectEmployeesLoading);
  const error = useAppSelector(selectEmployeesError);

  // Check if entered serial number is currently held by another active employee
  const duplicateOwner = useMemo(() => {
    const clean = laptopSerialNumber.trim().toLowerCase();
    if (!clean || !editingEmployee) return null;
    return items.find(
      (e) => e.id !== editingEmployee.id && e.laptopSerialNumber?.trim().toLowerCase() === clean,
    );
  }, [laptopSerialNumber, editingEmployee, items]);

  // Check if entered company SIM phone number is currently held by another active employee
  const duplicateSimOwner = useMemo(() => {
    const clean = companyPhoneNumber.trim().replace(/\s+/g, "");
    if (!clean || !isCompanySim || !editingEmployee) return null;
    return items.find(
      (e) =>
        e.id !== editingEmployee.id &&
        (e.isCompanySim || e.companyPhoneNumber) &&
        e.companyPhoneNumber?.trim().replace(/\s+/g, "") === clean,
    );
  }, [companyPhoneNumber, isCompanySim, editingEmployee, items]);

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

    const cleanSerial = laptopSerialNumber.trim();
    const cleanPhone = companyPhoneNumber.trim();

    if (duplicateOwner) {
      setTransferModal({
        targetEmployee: editingEmployee,
        duplicateOwner,
        cleanSerial,
        cleanType: cleanSerial ? laptopType.trim() : "",
      });
      return;
    }

    if (isCompanySim && duplicateSimOwner) {
      setTransferSimModal({
        targetEmployee: editingEmployee,
        duplicateOwner: duplicateSimOwner,
        cleanPhone,
      });
      return;
    }

    await executeSave(false, false);
  }

  async function executeSave(forceTransfer: boolean, forceSimTransfer: boolean = false) {
    if (!editingEmployee) return;
    const cleanSerial = laptopSerialNumber.trim();
    const cleanPhone = companyPhoneNumber.trim();
    const prevDuplicateOwner = transferModal?.duplicateOwner;
    const prevDuplicateSimOwner = transferSimModal?.duplicateOwner;

    setIsSubmitting(true);
    try {
      await dispatch(
        updateEmployee({
          id: editingEmployee.id,
          input: {
            laptopType: cleanSerial ? laptopType.trim() : "",
            laptopSerialNumber: cleanSerial,
            laptopStatus: cleanSerial ? laptopStatus : null,
            forceTransfer,
            isCompanySim,
            companyPhoneNumber: isCompanySim ? cleanPhone || null : null,
            forceSimTransfer,
            isIdCard,
            idCardNumber: null,
            isVisitingCard,
            visitingCardNumber: null,
          },
        }),
      ).unwrap();

      // If a transfer happened, re-fetch active employees so the previous owner is updated to "Not assigned" instantly!
      if (forceTransfer || forceSimTransfer || prevDuplicateOwner || prevDuplicateSimOwner) {
        await dispatch(
          fetchEmployees({
            page,
            size: pageSize,
            q: debouncedSearch.trim() || undefined,
            status: "active",
            force: true,
          }),
        ).unwrap();
      }

      toast.success(
        forceTransfer || forceSimTransfer ? "Asset Transferred" : "Assets updated",
        forceSimTransfer
          ? `SIM successfully transferred from ${prevDuplicateSimOwner?.name || "colleague"} to ${editingEmployee.name}.`
          : forceTransfer
          ? `Laptop successfully transferred from ${prevDuplicateOwner?.name || "colleague"} to ${editingEmployee.name}.`
          : `Updated asset assignments for ${editingEmployee.name} (${editingEmployee.employeeCode}).`,
      );
      setTransferModal(null);
      setTransferSimModal(null);
      closeEditModal();
    } catch (err) {
      toast.error("Couldn't save assets", getApiErrorMessage(err, "Failed to save asset details"));
    } finally {
      setIsSubmitting(false);
    }
  }

  function openReturnSimModal(emp: EmployeeListItem) {
    setSimReturnCondition("ACTIVE");
    setSimReturnRemarks("");
    setReturnSimModalEmployee(emp);
  }

  async function executeReturnSim(emp: EmployeeListItem) {
    setReturningSimId(emp.id);
    try {
      await dispatch(
        updateEmployee({
          id: emp.id,
          input: {
            isCompanySim: false,
            companyPhoneNumber: "",
            simReturnCondition,
            simReturnRemarks: simReturnRemarks.trim() || undefined,
            laptopType: emp.laptopType,
            laptopSerialNumber: emp.laptopSerialNumber,
            laptopStatus: emp.laptopStatus,
            isIdCard: emp.isIdCard,
            idCardNumber: null,
            isVisitingCard: emp.isVisitingCard,
            visitingCardNumber: null,
          },
        }),
      ).unwrap();

      toast.success(
        "Company SIM returned to stock",
        `SIM (${emp.companyPhoneNumber}) successfully returned from ${emp.name} to office inventory.`,
      );
      setReturnSimModalEmployee(null);
    } catch (err) {
      toast.error("Couldn't return SIM", getApiErrorMessage(err, "Failed to return SIM"));
    } finally {
      setReturningSimId(null);
    }
  }

  async function openSimHistoryModal(phoneNumber: string) {
    if (!phoneNumber) return;
    setSimHistoryModalInfo({ phoneNumber });
    setSimHistoryLoading(true);
    setSimHistoryList([]);
    try {
      const history = await hrService.getSimHistory(phoneNumber);
      setSimHistoryList(history || []);
    } catch (err) {
      toast.error("Couldn't load SIM history", getApiErrorMessage(err, "Failed to fetch SIM lifecycle history"));
    } finally {
      setSimHistoryLoading(false);
    }
  }

  function openReturnModal(emp: EmployeeListItem) {
    setReturnCondition("WORKING");
    setReturnRemarks("");
    setReturnModalEmployee(emp);
  }

  async function executeReturn(emp: EmployeeListItem) {
    setReturningId(emp.id);
    try {
      await dispatch(
        updateEmployee({
          id: emp.id,
          input: {
            laptopType: "",
            laptopSerialNumber: "",
            laptopStatus: null,
            returnCondition,
            returnRemarks: returnRemarks.trim() || undefined,
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
        `Laptop successfully returned from ${emp.name} with condition recorded as ${returnCondition === "DAMAGED" ? "Damaged / Faulty" : "Working / Good Shape"}.`,
      );
      setReturnModalEmployee(null);
    } catch (err) {
      toast.error("Couldn't return laptop", getApiErrorMessage(err, "Failed to return laptop"));
    } finally {
      setReturningId(null);
    }
  }

  async function openHistoryModal(serialNumber: string, laptopType?: string | null) {
    if (!serialNumber) return;
    setHistoryModalInfo({ serialNumber, laptopType });
    setHistoryLoading(true);
    setHistoryList([]);
    try {
      const history = await hrService.getLaptopHistory(serialNumber);
      setHistoryList(history || []);
    } catch (err) {
      toast.error("Couldn't load history", getApiErrorMessage(err, "Failed to fetch laptop lifecycle history"));
    } finally {
      setHistoryLoading(false);
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
      const simSeen = formatLastSeen(emp.lastLoginAt);
      const isSimActive = hasSim && simSeen.daysInactive < 7;
      const isSimIdle = hasSim && simSeen.daysInactive >= 7;
      const hasIdCard = Boolean(emp.isIdCard);
      const hasVisitingCard = Boolean(emp.isVisitingCard);

      if (filterMode === "laptop_working" && !isWorking) return false;
      if (filterMode === "laptop_idle" && !isIdle) return false;
      if (filterMode === "laptop_damaged" && !isDamaged) return false;
      if (filterMode === "has_laptop" && !hasLaptop) return false;
      if (filterMode === "no_laptop" && hasLaptop) return false;
      if (filterMode === "sim_active" && !isSimActive) return false;
      if (filterMode === "sim_idle" && !isSimIdle) return false;
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
    const simsActive = items.filter((e) => {
      if (!e.isCompanySim && !e.companyPhoneNumber) return false;
      return formatLastSeen(e.lastLoginAt).daysInactive < 7;
    }).length;
    const simsIdle = simsAssigned - simsActive;
    const bothAssigned = items.filter((e) => (e.laptopSerialNumber || e.laptopType) && (e.isCompanySim || e.companyPhoneNumber)).length;

    return { total, laptopsAssigned, laptopsWorking, laptopsIdle, laptopsDamaged, simsAssigned, simsActive, simsIdle, bothAssigned };
  }, [items, meta]);

  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      {/* KPI Cards (Clickable to quickly filter) */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
        <button
          type="button"
          onClick={() => setFilterMode("all")}
          className="text-left transition transform active:scale-[0.99] focus:outline-none"
        >
          <Card
            className={`flex h-full items-center gap-4 p-4 border transition-all hover:shadow-md ${
              filterMode === "all" ? "border-primary/50 bg-primary/5 ring-2 ring-primary/20" : "border-border bg-card shadow-sm"
            }`}
          >
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
        </button>

        <button
          type="button"
          onClick={() => setFilterMode("has_laptop")}
          className="text-left transition transform active:scale-[0.99] focus:outline-none"
        >
          <Card
            className={`flex h-full items-center gap-4 p-4 border transition-all hover:shadow-md ${
              filterMode === "has_laptop"
                ? "border-blue-500/60 bg-blue-500/10 ring-2 ring-blue-500/20"
                : "border-blue-500/20 bg-blue-500/5 shadow-sm"
            }`}
          >
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
        </button>

        <button
          type="button"
          onClick={() => setFilterMode("laptop_working")}
          className="text-left transition transform active:scale-[0.99] focus:outline-none"
        >
          <Card
            className={`flex h-full items-center gap-4 p-4 border transition-all hover:shadow-md ${
              filterMode === "laptop_working"
                ? "border-emerald-500/60 bg-emerald-500/10 ring-2 ring-emerald-500/20"
                : "border-emerald-500/20 bg-emerald-500/5 shadow-sm"
            }`}
          >
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
        </button>

        <button
          type="button"
          onClick={() => setFilterMode("laptop_idle")}
          className="text-left transition transform active:scale-[0.99] focus:outline-none"
        >
          <Card
            className={`flex h-full items-center gap-4 p-4 border transition-all hover:shadow-md ${
              filterMode === "laptop_idle" || filterMode === "sim_idle"
                ? "border-amber-500/60 bg-amber-500/10 ring-2 ring-amber-500/20"
                : "border-amber-500/20 bg-amber-500/5 shadow-sm"
            }`}
          >
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
        </button>

        <button
          type="button"
          onClick={() => setFilterMode("has_sim")}
          className="text-left transition transform active:scale-[0.99] focus:outline-none"
        >
          <Card
            className={`flex h-full items-center gap-4 p-4 border transition-all hover:shadow-md ${
              filterMode === "has_sim" || filterMode === "sim_active" || filterMode === "sim_idle"
                ? "border-purple-500/60 bg-purple-500/10 ring-2 ring-purple-500/20"
                : "border-purple-500/20 bg-purple-500/5 shadow-sm"
            }`}
          >
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
              <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5 mt-0.5">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{stats.simsActive} Active</span>
                {stats.simsIdle > 0 ? (
                  <>
                    <span>·</span>
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">{stats.simsIdle} Idle</span>
                  </>
                ) : null}
              </p>
            </div>
          </Card>
        </button>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="space-y-3 rounded-2xl border border-border bg-surface-muted/40 p-4">
        {/* Quick Filter Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground mr-1">Quick Filters:</span>
          
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              filterMode === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border border-border bg-card text-muted-foreground hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            All Employees ({stats.total})
          </button>

          <button
            type="button"
            onClick={() => setFilterMode("has_laptop")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              filterMode === "has_laptop"
                ? "bg-blue-600 text-white shadow-sm"
                : "border border-border bg-card text-muted-foreground hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            <Laptop className="h-3.5 w-3.5" />
            Laptops ({stats.laptopsAssigned})
          </button>

          <button
            type="button"
            onClick={() => setFilterMode("has_sim")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              filterMode === "has_sim"
                ? "bg-purple-600 text-white shadow-sm"
                : "border border-border bg-card text-muted-foreground hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            SIMs ({stats.simsAssigned})
          </button>

          <button
            type="button"
            onClick={() => setFilterMode("laptop_idle")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              filterMode === "laptop_idle"
                ? "bg-amber-600 text-white shadow-sm"
                : "border border-border bg-card text-muted-foreground hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            🟡 Idle Laptops ({stats.laptopsIdle})
          </button>

          <button
            type="button"
            onClick={() => setFilterMode("sim_idle")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              filterMode === "sim_idle"
                ? "bg-amber-600 text-white shadow-sm"
                : "border border-border bg-card text-muted-foreground hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            🟡 Idle SIMs ({stats.simsIdle})
          </button>

          {stats.laptopsDamaged > 0 ? (
            <button
              type="button"
              onClick={() => setFilterMode("laptop_damaged")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filterMode === "laptop_damaged"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "border border-border bg-card text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              🔴 Damaged ({stats.laptopsDamaged})
            </button>
          ) : null}
        </div>

        {/* Search & Extended Dropdown */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
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
              <option value="all">More Filters: All Assets</option>
              <option value="laptop_working">🟢 Laptops Working (In Active Use)</option>
              <option value="laptop_idle">🟡 Laptops Idle (Inactive 7+ Days)</option>
              <option value="laptop_damaged">🔴 Laptops Damaged / Needs Repair</option>
              <option value="has_laptop">All Laptops Assigned</option>
              <option value="no_laptop">No Laptop Assigned</option>
              <option value="sim_active">🟢 SIMs Active (In Active Use)</option>
              <option value="sim_idle">🟡 SIMs Idle (Inactive 7+ Days)</option>
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
      </div>

      {error ? (
        <ErrorDisplay message={error} />
      ) : null}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="py-3.5 pl-6 pr-4 w-[28%]">Employee</th>
                <th className="px-4 py-3.5 w-[34%]">Laptop Asset</th>
                <th className="px-4 py-3.5 w-[24%]">Company SIM</th>
                <th className="px-4 py-3.5 w-[14%]">Cards</th>
                <th className="py-3.5 pl-4 pr-6 text-right w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface-elevated text-sm">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6">
                    <TableSkeleton rows={5} />
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12">
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
                  const lastSeen = formatLastSeen(emp.lastLoginAt);

                  return (
                    <tr key={emp.id} className="transition-colors hover:bg-surface-hover/70">
                      {/* Employee Details */}
                      <td className="py-4 pl-6 pr-4 align-top">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary">
                            {emp.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground text-sm leading-tight">{emp.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{emp.employeeCode}</p>
                            <span className="inline-block mt-1 rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {emp.departmentName || "General"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Laptop Asset (Merged Model, Serial, Usage Condition & Return) */}
                      <td className="px-4 py-4 align-top">
                        {hasLaptop ? (
                          <div className="space-y-2">
                            {/* Device & Serial Bar */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-muted px-2 py-0.5 text-xs font-semibold text-foreground">
                                <Laptop className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                {emp.laptopType || "Office Laptop"}
                              </span>

                              {emp.laptopSerialNumber ? (
                                <span className="inline-flex items-center font-mono text-[11px] font-medium text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/80">
                                  S/N: {emp.laptopSerialNumber}
                                </span>
                              ) : null}

                              {emp.laptopSerialNumber ? (
                                <button
                                  type="button"
                                  onClick={() => openHistoryModal(emp.laptopSerialNumber!, emp.laptopType)}
                                  title="View complete assignment and damage history"
                                  className="inline-flex items-center gap-1 rounded border border-border bg-card px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground transition hover:border-primary/50 hover:bg-surface-hover hover:text-foreground"
                                >
                                  <History className="h-3 w-3 text-primary" />
                                  <span>History</span>
                                </button>
                              ) : null}

                              {/* Return Laptop Inline */}
                              <button
                                type="button"
                                onClick={() => openReturnModal(emp)}
                                disabled={returningId === emp.id}
                                title="Return laptop to office stock"
                                className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
                              >
                                {returningId === emp.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Undo2 className="h-3 w-3" />
                                )}
                                <span>Return</span>
                              </button>
                            </div>

                            {/* Status & Activity Pill (High Contrast) */}
                            <div>
                              {emp.laptopStatus === "DAMAGED" ? (
                                <div className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/40 bg-rose-500/15 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300">
                                  <ShieldAlert className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                                  <span>🔴 Damaged / Under Repair</span>
                                </div>
                              ) : emp.laptopStatus === "WORKING" ? (
                                <div className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                  <span>🟢 Working / In Use</span>
                                  <span className="text-[11px] font-normal text-muted-foreground ml-1">
                                    ({lastSeen.label})
                                  </span>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:text-amber-300">
                                  <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                  <span>🟡 Idle / Not in Use</span>
                                  <span className="text-[11px] font-normal text-amber-800/80 dark:text-amber-300/80 ml-1">
                                    ({lastSeen.daysInactive < 999 ? `${lastSeen.daysInactive}d inactive` : "No login recorded"})
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openEditModal(emp)}
                            title={`Assign a laptop to ${emp.name}`}
                            className="group inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border/80 bg-surface-muted/30 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            <Plus className="h-3.5 w-3.5 text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition" />
                            <span>Assign Laptop</span>
                          </button>
                        )}
                      </td>

                      {/* Company SIM */}
                      <td className="px-4 py-4 align-top">
                        {hasSim ? (
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 rounded-lg border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-xs font-semibold text-purple-700 dark:text-purple-300">
                                <Smartphone className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                                {emp.companyPhoneNumber || "Active SIM"}
                              </span>

                              {emp.companyPhoneNumber ? (
                                <button
                                  type="button"
                                  onClick={() => openSimHistoryModal(emp.companyPhoneNumber!)}
                                  title="View SIM lifecycle and audit history"
                                  className="inline-flex items-center gap-1 rounded border border-border bg-card px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground transition hover:border-primary/50 hover:bg-surface-hover hover:text-foreground"
                                >
                                  <History className="h-3 w-3 text-primary" />
                                  <span>History</span>
                                </button>
                              ) : null}

                              {/* Return SIM Inline */}
                              <button
                                type="button"
                                onClick={() => openReturnSimModal(emp)}
                                disabled={returningSimId === emp.id}
                                title="Return SIM to office inventory"
                                className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
                              >
                                {returningSimId === emp.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Undo2 className="h-3 w-3" />
                                )}
                                <span>Return</span>
                              </button>
                            </div>

                            {/* Live Usage / Inactivity Status */}
                            <div>
                              {lastSeen.daysInactive < 7 ? (
                                <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <span>In Active Use</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                                  <Clock className="h-3 w-3 text-amber-600" />
                                  <span>Idle ({lastSeen.daysInactive < 999 ? `${lastSeen.daysInactive}d inactive` : "no login"})</span>
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openEditModal(emp)}
                            title={`Assign a company SIM to ${emp.name}`}
                            className="group inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border/80 bg-surface-muted/30 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-purple-500/50 hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400"
                          >
                            <Plus className="h-3.5 w-3.5 text-muted-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition" />
                            <span>Assign SIM</span>
                          </button>
                        )}
                      </td>

                      {/* Cards */}
                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {emp.isIdCard ? (
                            <span
                              title="ID Card Issued"
                              className="inline-flex items-center gap-1 rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[11px] font-semibold text-purple-700 dark:text-purple-300"
                            >
                              <CreditCard className="h-3 w-3" />
                              <span>ID Card</span>
                            </span>
                          ) : null}
                          {emp.isVisitingCard ? (
                            <span
                              title="Visiting Card Issued"
                              className="inline-flex items-center gap-1 rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300"
                            >
                              <Contact className="h-3 w-3" />
                              <span>Visiting Card</span>
                            </span>
                          ) : null}
                          {!emp.isIdCard && !emp.isVisitingCard ? (
                            <button
                              type="button"
                              onClick={() => openEditModal(emp)}
                              title={`Issue ID or visiting cards to ${emp.name}`}
                              className="group inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border/80 bg-surface-muted/30 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-border hover:bg-surface-hover hover:text-foreground"
                            >
                              <Plus className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition" />
                              <span>Issue Cards</span>
                            </button>
                          ) : null}
                        </div>
                      </td>

                      {/* HR Quick Actions (Always Visible!) */}
                      <td className="py-4 pl-4 pr-6 text-right align-top">
                        <button
                          type="button"
                          onClick={() => openEditModal(emp)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition hover:border-primary hover:bg-surface-hover hover:text-primary"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-primary" />
                          <span>Edit</span>
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
              {duplicateOwner && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-amber-800 dark:text-amber-300">
                      Already Assigned to {duplicateOwner.name} ({duplicateOwner.employeeCode})
                    </p>
                    <p className="text-amber-700/90 dark:text-amber-400">
                      Saving will prompt to transfer this laptop to {editingEmployee.name}.
                    </p>
                  </div>
                </div>
              )}
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
                    className="block h-10 w-full rounded-xl border border-border bg-card px-3 font-mono text-sm text-foreground shadow focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                  {duplicateSimOwner && (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs">
                      <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-semibold text-amber-800 dark:text-amber-300">
                          Already Assigned to {duplicateSimOwner.name} ({duplicateSimOwner.employeeCode})
                        </p>
                        <p className="text-amber-700/90 dark:text-amber-400">
                          Saving will open the transfer modal to safely reassign this SIM to {editingEmployee.name}.
                        </p>
                      </div>
                    </div>
                  )}
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

      {/* Transfer Laptop Confirmation Modal */}
      {transferModal && (
        <Dialog
          open={Boolean(transferModal)}
          onClose={() => !isSubmitting && setTransferModal(null)}
          title="Transfer Laptop Asset"
          size="sm"
        >
          <div className="space-y-4 p-6">
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs font-medium text-amber-800 dark:text-amber-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>This laptop is currently assigned to another employee.</span>
            </div>

            {/* Asset details badge */}
            <div className="rounded-xl border border-border bg-surface-muted/30 p-3.5 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Asset Details</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Laptop className="h-4 w-4 text-primary" />
                  {transferModal.cleanType || "Office Laptop"}
                </span>
                <span className="font-mono text-xs font-bold rounded-md bg-card border border-border px-2 py-0.5 text-foreground">
                  {transferModal.cleanSerial}
                </span>
              </div>
            </div>

            {/* Visual Transfer Flow: Current Holder -> New Assignee */}
            <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Transfer Route</p>
              
              <div className="flex items-center justify-between gap-2">
                {/* Previous Holder */}
                <div className="flex-1 rounded-xl border border-rose-500/20 bg-rose-50/50 dark:bg-rose-950/20 p-2.5 min-w-0">
                  <p className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 uppercase">Current Holder</p>
                  <p className="font-semibold text-foreground text-xs truncate mt-0.5">{transferModal.duplicateOwner.name}</p>
                  <p className="text-[11px] text-muted-foreground">{transferModal.duplicateOwner.employeeCode}</p>
                </div>

                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-muted-foreground">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>

                {/* New Assignee */}
                <div className="flex-1 rounded-xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 min-w-0">
                  <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase">New Assignee</p>
                  <p className="font-semibold text-foreground text-xs truncate mt-0.5">{transferModal.targetEmployee.name}</p>
                  <p className="text-[11px] text-muted-foreground">{transferModal.targetEmployee.employeeCode}</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Confirming will unassign this laptop from <strong className="text-foreground">{transferModal.duplicateOwner.name}</strong> and reassign it to <strong className="text-foreground">{transferModal.targetEmployee.name}</strong>.
            </p>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setTransferModal(null)}
                disabled={isSubmitting}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void executeSave(true)}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition hover:brightness-110 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Transferring...</span>
                  </>
                ) : (
                  <span>Confirm & Transfer Laptop</span>
                )}
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Return to Office Stock Modal */}
      {returnModalEmployee && (
        <Dialog
          open={Boolean(returnModalEmployee)}
          onClose={() => !returningId && setReturnModalEmployee(null)}
          title="Return Laptop to Office Stock"
          size="sm"
        >
          <div className="space-y-4 p-6">
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
              <Undo2 className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <p className="leading-relaxed">
                This laptop will be returned to company inventory and unassigned from the employee.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface-muted/30 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Employee:</span>
                <span className="font-semibold text-foreground">{returnModalEmployee.name} ({returnModalEmployee.employeeCode})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Laptop Model:</span>
                <span className="font-semibold text-foreground">{returnModalEmployee.laptopType || "Office Laptop"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Serial Number:</span>
                <span className="font-mono font-bold text-foreground">{returnModalEmployee.laptopSerialNumber}</span>
              </div>
            </div>

            {/* Condition check upon return */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <span>Device Condition at Return</span>
                <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setReturnCondition("WORKING")}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-medium transition ${
                    returnCondition === "WORKING"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:bg-surface-muted"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>🟢 Working / Good</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReturnCondition("DAMAGED")}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-medium transition ${
                    returnCondition === "DAMAGED"
                      ? "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:bg-surface-muted"
                  }`}
                >
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                  <span>🔴 Damaged / Faulty</span>
                </button>
              </div>
            </div>

            {/* Remarks / inspection note */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Inspection Remarks / Notes
              </label>
              <textarea
                value={returnRemarks}
                onChange={(e) => setReturnRemarks(e.target.value)}
                rows={2}
                placeholder="e.g. Charger returned, screen fine, minor dent on corner..."
                className="block w-full rounded-xl border border-border bg-card p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setReturnModalEmployee(null)}
                disabled={Boolean(returningId)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void executeReturn(returnModalEmployee)}
                disabled={Boolean(returningId)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-sm font-semibold text-white shadow transition disabled:opacity-60"
              >
                {returningId ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Returning...</span>
                  </>
                ) : (
                  <span>Deposit to Office Stock</span>
                )}
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Laptop Lifecycle History & Audit Trail Modal */}
      {historyModalInfo && (
        <Dialog
          open={Boolean(historyModalInfo)}
          onClose={() => setHistoryModalInfo(null)}
          title="Laptop Lifecycle & Custody History"
          size="md"
        >
          <div className="space-y-4 p-6">
            {/* Header info */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface-muted/40 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Laptop className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {historyModalInfo.laptopType || "Office Laptop"}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    Serial: <span className="font-bold text-foreground">{historyModalInfo.serialNumber}</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground">
                  <History className="h-3.5 w-3.5 text-primary" />
                  <span>{historyList.length} Event{historyList.length === 1 ? "" : "s"}</span>
                </span>
              </div>
            </div>

            {/* Content / Timeline */}
            {historyLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Loader2 className="h-7 w-7 animate-spin text-primary mb-2" />
                <p className="text-xs font-medium">Fetching lifecycle history audit trail...</p>
              </div>
            ) : historyList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-surface-muted/20 p-8 text-center">
                <Clock className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
                <p className="text-sm font-semibold text-foreground">No History Logged Yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Assignments, transfers, condition remarks, and returns for this serial number will automatically record here.
                </p>
              </div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto pr-1">
                <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
                  {historyList.map((entry) => {
                    const isDamaged = entry.deviceCondition === "DAMAGED" || entry.actionType === "DAMAGED";
                    const isReturn = entry.actionType === "RETURNED";
                    const isTransfer = entry.actionType === "TRANSFERRED";

                    const badgeColor = isDamaged
                      ? "bg-rose-50 text-rose-700 border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-300"
                      : isReturn
                      ? "bg-amber-50 text-amber-700 border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300"
                      : isTransfer
                      ? "bg-purple-50 text-purple-700 border-purple-500/30 dark:bg-purple-950/40 dark:text-purple-300"
                      : "bg-emerald-50 text-emerald-700 border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300";

                    const dotBg = isDamaged
                      ? "bg-rose-500 ring-rose-200 dark:ring-rose-900"
                      : isReturn
                      ? "bg-amber-500 ring-amber-200 dark:ring-amber-900"
                      : isTransfer
                      ? "bg-purple-500 ring-purple-200 dark:ring-purple-900"
                      : "bg-emerald-500 ring-emerald-200 dark:ring-emerald-900";

                    const formattedDate = new Date(entry.createdAt).toLocaleString("en-US", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <div key={entry.id} className="relative group">
                        {/* Timeline dot */}
                        <div
                          className={`absolute -left-[19px] top-1.5 h-3.5 w-3.5 rounded-full ring-4 ${dotBg}`}
                        />

                        {/* Card */}
                        <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs space-y-2 transition hover:border-primary/30 hover:shadow-sm">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${badgeColor}`}
                              >
                                {isDamaged ? (
                                  <ShieldAlert className="h-3 w-3" />
                                ) : isReturn ? (
                                  <Undo2 className="h-3 w-3" />
                                ) : isTransfer ? (
                                  <ArrowRight className="h-3 w-3" />
                                ) : (
                                  <CheckCircle2 className="h-3 w-3" />
                                )}
                                <span>{entry.actionType}</span>
                              </span>

                              {entry.deviceCondition ? (
                                <span
                                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                                    entry.deviceCondition === "DAMAGED"
                                      ? "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200"
                                      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
                                  }`}
                                >
                                  {entry.deviceCondition === "DAMAGED" ? "⚠️ Damaged Condition" : "✓ Good / Working"}
                                </span>
                              ) : null}
                            </div>

                            <span className="text-[11px] text-muted-foreground font-medium">
                              {formattedDate}
                            </span>
                          </div>

                          {/* Employee info */}
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground font-medium">
                              {isReturn ? "Returned by:" : isTransfer ? "Transferred holder:" : "Assigned to:"}
                            </span>
                            <span className="font-semibold text-foreground">
                              {entry.employeeName || "Employee"}
                            </span>
                            {entry.employeeCode ? (
                              <span className="font-mono text-[11px] text-muted-foreground">
                                ({entry.employeeCode})
                              </span>
                            ) : null}
                          </div>

                          {/* Remarks */}
                          {entry.remarks ? (
                            <div className="rounded-lg bg-surface-muted/60 border border-border/70 p-2 text-xs text-foreground/90">
                              <span className="font-semibold text-muted-foreground mr-1.5">Note:</span>
                              <span>{entry.remarks}</span>
                            </div>
                          ) : null}

                          {/* Performed by */}
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 pt-1 border-t border-border/50">
                            <span>Logged by: {entry.performedByName || "HR Admin"}</span>
                            <span>ID: #{entry.id}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setHistoryModalInfo(null)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
              >
                Close Audit Trail
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Transfer SIM Confirmation Modal */}
      {transferSimModal && (
        <Dialog
          open={Boolean(transferSimModal)}
          onClose={() => !isSubmitting && setTransferSimModal(null)}
          title="Transfer Company SIM Asset"
          size="sm"
        >
          <div className="space-y-4 p-6">
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs font-medium text-amber-800 dark:text-amber-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>This Company SIM is currently assigned to another employee.</span>
            </div>

            {/* Asset details badge */}
            <div className="rounded-xl border border-border bg-surface-muted/30 p-3.5 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Asset Details</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Smartphone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Company SIM
                </span>
                <span className="font-mono text-xs font-bold rounded-md bg-card border border-border px-2 py-0.5 text-foreground">
                  {transferSimModal.cleanPhone}
                </span>
              </div>
            </div>

            {/* Visual Transfer Flow: Current Holder -> New Assignee */}
            <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Transfer Route</p>
              
              <div className="flex items-center justify-between gap-2">
                {/* Previous Holder */}
                <div className="flex-1 rounded-xl border border-rose-500/20 bg-rose-50/50 dark:bg-rose-950/20 p-2.5 min-w-0">
                  <p className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 uppercase">Current Holder</p>
                  <p className="font-semibold text-foreground text-xs truncate mt-0.5">{transferSimModal.duplicateOwner.name}</p>
                  <p className="text-[11px] text-muted-foreground">{transferSimModal.duplicateOwner.employeeCode}</p>
                </div>

                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-muted-foreground">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>

                {/* New Assignee */}
                <div className="flex-1 rounded-xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 min-w-0">
                  <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase">New Assignee</p>
                  <p className="font-semibold text-foreground text-xs truncate mt-0.5">{transferSimModal.targetEmployee.name}</p>
                  <p className="text-[11px] text-muted-foreground">{transferSimModal.targetEmployee.employeeCode}</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Confirming will unassign this SIM from <strong className="text-foreground">{transferSimModal.duplicateOwner.name}</strong> and reassign it to <strong className="text-foreground">{transferSimModal.targetEmployee.name}</strong>.
            </p>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setTransferSimModal(null)}
                disabled={isSubmitting}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void executeSave(false, true)}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow transition disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Transferring...</span>
                  </>
                ) : (
                  <span>Confirm & Transfer SIM</span>
                )}
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Return SIM to Office Stock Modal */}
      {returnSimModalEmployee && (
        <Dialog
          open={Boolean(returnSimModalEmployee)}
          onClose={() => !returningSimId && setReturnSimModalEmployee(null)}
          title="Return Company SIM to Office Stock"
          size="sm"
        >
          <div className="space-y-4 p-6">
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
              <Undo2 className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <p className="leading-relaxed">
                This SIM card will be returned to company office inventory and unassigned from the employee.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface-muted/30 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Employee:</span>
                <span className="font-semibold text-foreground">{returnSimModalEmployee.name} ({returnSimModalEmployee.employeeCode})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Phone Number:</span>
                <span className="font-mono font-bold text-foreground">{returnSimModalEmployee.companyPhoneNumber}</span>
              </div>
            </div>

            {/* Condition check upon return */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <span>SIM Status at Return</span>
                <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSimReturnCondition("ACTIVE")}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-medium transition ${
                    simReturnCondition === "ACTIVE"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:bg-surface-muted"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>🟢 Active / Working</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSimReturnCondition("LOST")}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-medium transition ${
                    simReturnCondition === "LOST"
                      ? "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:bg-surface-muted"
                  }`}
                >
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                  <span>🔴 Lost / Damaged</span>
                </button>
              </div>
            </div>

            {/* Remarks / inspection note */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Inspection Remarks / Notes
              </label>
              <textarea
                value={simReturnRemarks}
                onChange={(e) => setSimReturnRemarks(e.target.value)}
                rows={2}
                placeholder="e.g. Physical SIM deposited back, active connection..."
                className="block w-full rounded-xl border border-border bg-card p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setReturnSimModalEmployee(null)}
                disabled={Boolean(returningSimId)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void executeReturnSim(returnSimModalEmployee)}
                disabled={Boolean(returningSimId)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-sm font-semibold text-white shadow transition disabled:opacity-60"
              >
                {returningSimId ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Returning...</span>
                  </>
                ) : (
                  <span>Deposit SIM to Stock</span>
                )}
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* SIM Lifecycle History & Audit Trail Modal */}
      {simHistoryModalInfo && (
        <Dialog
          open={Boolean(simHistoryModalInfo)}
          onClose={() => setSimHistoryModalInfo(null)}
          title="SIM Card Lifecycle & Custody History"
          size="md"
        >
          <div className="space-y-4 p-6">
            {/* Header info */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface-muted/40 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Company SIM Card
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    Number: <span className="font-bold text-foreground">{simHistoryModalInfo.phoneNumber}</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground">
                  <History className="h-3.5 w-3.5 text-primary" />
                  <span>{simHistoryList.length} Event{simHistoryList.length === 1 ? "" : "s"}</span>
                </span>
              </div>
            </div>

            {/* Content / Timeline */}
            {simHistoryLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Loader2 className="h-7 w-7 animate-spin text-primary mb-2" />
                <p className="text-xs font-medium">Fetching SIM lifecycle audit trail...</p>
              </div>
            ) : simHistoryList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-surface-muted/20 p-8 text-center">
                <Clock className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
                <p className="text-sm font-semibold text-foreground">No History Logged Yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Assignments, transfers, condition remarks, and returns for this SIM number will automatically record here.
                </p>
              </div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto pr-1">
                <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
                  {simHistoryList.map((entry) => {
                    const isDamagedOrLost = entry.simStatus === "LOST" || entry.simStatus === "DAMAGED" || entry.actionType === "LOST" || entry.actionType === "DAMAGED";
                    const isReturn = entry.actionType === "RETURNED";
                    const isTransfer = entry.actionType === "TRANSFERRED";

                    const badgeColor = isDamagedOrLost
                      ? "bg-rose-50 text-rose-700 border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-300"
                      : isReturn
                      ? "bg-amber-50 text-amber-700 border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300"
                      : isTransfer
                      ? "bg-purple-50 text-purple-700 border-purple-500/30 dark:bg-purple-950/40 dark:text-purple-300"
                      : "bg-emerald-50 text-emerald-700 border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300";

                    const dotBg = isDamagedOrLost
                      ? "bg-rose-500 ring-rose-200 dark:ring-rose-900"
                      : isReturn
                      ? "bg-amber-500 ring-amber-200 dark:ring-amber-900"
                      : isTransfer
                      ? "bg-purple-500 ring-purple-200 dark:ring-purple-900"
                      : "bg-emerald-500 ring-emerald-200 dark:ring-emerald-900";

                    const formattedDate = new Date(entry.createdAt).toLocaleString("en-US", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <div key={entry.id} className="relative group">
                        {/* Timeline dot */}
                        <div
                          className={`absolute -left-[19px] top-1.5 h-3.5 w-3.5 rounded-full ring-4 ${dotBg}`}
                        />

                        {/* Card */}
                        <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs space-y-2 transition hover:border-primary/30 hover:shadow-sm">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${badgeColor}`}
                              >
                                {isDamagedOrLost ? (
                                  <ShieldAlert className="h-3 w-3" />
                                ) : isReturn ? (
                                  <Undo2 className="h-3 w-3" />
                                ) : isTransfer ? (
                                  <ArrowRight className="h-3 w-3" />
                                ) : (
                                  <CheckCircle2 className="h-3 w-3" />
                                )}
                                <span>{entry.actionType}</span>
                              </span>

                              {entry.simStatus ? (
                                <span
                                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                                    isDamagedOrLost
                                      ? "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200"
                                      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
                                  }`}
                                >
                                  {isDamagedOrLost ? "⚠️ Lost / Inactive" : "✓ Active Connection"}
                                </span>
                              ) : null}
                            </div>

                            <span className="text-[11px] text-muted-foreground font-medium">
                              {formattedDate}
                            </span>
                          </div>

                          {/* Employee info */}
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground font-medium">
                              {isReturn ? "Returned by:" : isTransfer ? "Transferred holder:" : "Assigned to:"}
                            </span>
                            <span className="font-semibold text-foreground">
                              {entry.employeeName || "Employee"}
                            </span>
                            {entry.employeeCode ? (
                              <span className="font-mono text-[11px] text-muted-foreground">
                                ({entry.employeeCode})
                              </span>
                            ) : null}
                          </div>

                          {/* Remarks */}
                          {entry.remarks ? (
                            <div className="rounded-lg bg-surface-muted/60 border border-border/70 p-2 text-xs text-foreground/90">
                              <span className="font-semibold text-muted-foreground mr-1.5">Note:</span>
                              <span>{entry.remarks}</span>
                            </div>
                          ) : null}

                          {/* Performed by */}
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 pt-1 border-t border-border/50">
                            <span>Logged by: {entry.performedByName || "HR Admin"}</span>
                            <span>ID: #{entry.id}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSimHistoryModalInfo(null)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
              >
                Close Audit Trail
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
