import { useState, type FormEvent, type ReactNode } from "react";

import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  CheckCircle2,
  Download,
  FileText,
  GraduationCap,
  Loader2,
  Mail,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { useAuth } from "@features/auth";
import type { EmployeeLookupItem } from "@features/hr";
import { hrService } from "@features/hr/services";
import { useToast } from "@shared/components/feedback";
import {
  AnimatedFilterSelect,
  Card,
  DatePicker,
  Dialog,
  EmptyState,
  TableSkeleton,
} from "@shared/components/ui";
import { getApiErrorMessage } from "@shared/lib";
import { Select } from "@hrm/components/ui/select";
import { RefreshButton } from "@/components/ui/RefreshButton";

import {
  useCreateOfferLetter,
  useDeleteOfferLetter,
  useMyOfferLetters,
  useOfferLetters,
  useOfferLetterSummary,
  useUpdateOfferStatus,
} from "../hooks";
import { offersService } from "../services";
import type { OfferLetter, OfferLetterInput, OfferStatus, OfferType } from "../types";

const STATUS_OPTIONS: Array<{ value: OfferStatus; label: string; tone: string }> = [
  { value: "ISSUED", label: "Issued", tone: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  { value: "ACCEPTED", label: "Accepted", tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  { value: "DECLINED", label: "Declined", tone: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300" },
  { value: "EXPIRED", label: "Expired", tone: "border-border bg-surface-muted text-muted-foreground" },
];

function OfferTypeBadge({ type }: { type: OfferType }) {
  const isIntern = type === "INTERNSHIP";
  return (
    <span
      className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
        isIntern
          ? "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300"
          : "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300"
      }`}
    >
      {isIntern ? "Internship" : "Full-Time"}
    </span>
  );
}

function StatusBadge({ status }: { status: OfferStatus }) {
  const opt = STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0]!;
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${opt.tone}`}>
      {opt.label}
    </span>
  );
}

function formatCurrency(val: number | null | undefined): string {
  if (val == null) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);
}

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-surface-elevated px-3 text-sm font-medium text-foreground shadow outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60";

export function OffersPage() {
  const { role } = useAuth();
  const isEmployee = role === "EMPLOYEE";
  const canManage = role === "ADMIN" || role === "HR" || role === "HR_HEAD";
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [offerType, setOfferType] = useState<OfferType | "">("");
  const [status, setStatus] = useState<OfferStatus | "">("");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const myOffers = useMyOfferLetters(isEmployee);
  const summary = useOfferLetterSummary(!isEmployee);
  const offers = useOfferLetters(
    {
      page,
      size: 10,
      offerType: offerType || undefined,
      status: status || undefined,
      search: search.trim() || undefined,
    },
    !isEmployee,
  );

  const updateStatus = useUpdateOfferStatus();
  const deleteOffer = useDeleteOfferLetter();

  async function handleDownload(offer: OfferLetter) {
    try {
      setDownloadingId(offer.id);
      const safeName = offer.recipientName.replace(/[^a-zA-Z0-9_-]+/g, "_");
      const prefix = offer.offerType === "INTERNSHIP" ? "Internship_Offer" : "Appointment_Letter";
      await offersService.downloadPdf(offer.id, `${prefix}_${safeName}.pdf`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to download offer PDF."));
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(offer: OfferLetter) {
    if (!window.confirm(`Delete offer letter ${offer.letterNumber} for ${offer.recipientName}?`)) return;
    try {
      await deleteOffer.mutateAsync(offer.id);
      toast.success("Offer letter deleted.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to delete offer letter."));
    }
  }

  if (isEmployee) {
    const items = myOffers.data ?? [];
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <RefreshButton
            onRefresh={() => myOffers.refetch()}
            isRefreshing={myOffers.isFetching}
            label="my offer letters"
            className="h-10 w-10 rounded-xl"
          />
        </div>

        {myOffers.isLoading ? (
          <TableSkeleton rows={3} />
        ) : myOffers.isError ? (
          <Card className="p-6 text-center text-sm text-danger">
            {getApiErrorMessage(myOffers.error, "Failed to load your offer letters.")}
          </Card>
        ) : items.length === 0 ? (
          <Card className="p-10 text-center">
            <EmptyState
              title="No offer letters yet"
              description="When HR issues your Appointment Letter or Internship Offer Letter, you can view and download it here."
            />
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((o) => {
              const isIntern = o.offerType === "INTERNSHIP";
              return (
                <Card key={o.id} className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <OfferTypeBadge type={o.offerType} />
                        <span className="font-mono text-xs text-muted-foreground">{o.letterNumber}</span>
                      </div>
                      <h3 className="text-base font-bold text-foreground">{o.designation}</h3>
                      {o.department && <p className="text-xs text-muted-foreground">{o.department}</p>}
                    </div>
                    <StatusBadge status={o.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 rounded-lg bg-surface-muted/50 p-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block">
                        {isIntern ? "Monthly Stipend" : "Annual CTC"}
                      </span>
                      <span className="font-bold text-foreground">
                        {isIntern
                          ? (o.monthlyStipend ?? 0) > 0
                            ? `${formatCurrency(o.monthlyStipend)} / mo`
                            : "Unpaid"
                          : formatCurrency(o.annualCtc)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">
                        {isIntern ? "Start Date" : "Joining Date"}
                      </span>
                      <span className="font-semibold text-foreground">{o.joiningDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
                    <span>Location: {o.location ?? "Jabalpur"}</span>
                    <button
                      type="button"
                      onClick={() => handleDownload(o)}
                      disabled={downloadingId === o.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 disabled:opacity-50"
                    >
                      {downloadingId === o.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      Download PDF
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const list = offers.data?.data ?? [];
  const meta = offers.data?.meta;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <RefreshButton
          onRefresh={() => Promise.all([offers.refetch(), summary.refetch()])}
          isRefreshing={offers.isFetching || summary.isFetching}
          label="offer letters"
          className="h-10 w-10 rounded-xl"
        />
        {canManage && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow transition hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create Offer Letter
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Offer Letters"
          value={summary.data?.totalOffers ?? 0}
          icon={<FileText className="h-5 w-5 text-primary" />}
        />
        <SummaryCard
          title="Full-Time Offers"
          value={summary.data?.fullTimeCount ?? 0}
          icon={<Briefcase className="h-5 w-5 text-orange-600 dark:text-orange-400" />}
        />
        <SummaryCard
          title="Internship Offers"
          value={summary.data?.internshipCount ?? 0}
          icon={<GraduationCap className="h-5 w-5 text-violet-600 dark:text-violet-400" />}
        />
        <SummaryCard
          title="Accepted"
          value={summary.data?.acceptedCount ?? 0}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
        />
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border/60 pb-3">
          {(
            [
              { value: "", label: "All Offers" },
              { value: "FULL_TIME", label: "Full-Time" },
              { value: "INTERNSHIP", label: "Internship" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => {
                setOfferType(tab.value);
                setPage(1);
              }}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                offerType === tab.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-surface-muted/60 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search name, ref no, code, designation..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-border bg-surface-elevated pl-9 pr-3 text-sm text-foreground shadow outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <AnimatedFilterSelect
            value={status}
            onValueChange={(next) => {
              setStatus(next as OfferStatus | "");
              setPage(1);
            }}
            options={[
              { value: "", label: "All Statuses" },
              ...STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label })),
            ]}
            ariaLabel="Filter offers by status"
          />
        </div>
      </Card>

      {offers.isLoading ? (
        <TableSkeleton rows={6} />
      ) : offers.isError ? (
        <Card className="p-6 text-center text-sm text-danger">
          {getApiErrorMessage(offers.error, "Failed to load offer letters.")}
        </Card>
      ) : list.length === 0 ? (
        <Card className="p-10 text-center">
          <EmptyState
            title="No offer letters found"
            description="Create Full-Time Appointment Letters or Internship Offer Letters to download PDFs and send emails."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Ref & Recipient</th>
                  <th className="px-4 py-3">Type & Role</th>
                  <th className="px-4 py-3">Compensation / Stipend</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {list.map((o) => {
                  const isIntern = o.offerType === "INTERNSHIP";
                  return (
                    <tr key={o.id} className="hover:bg-surface-muted/30 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-foreground">{o.recipientName}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {o.letterNumber} {o.employeeCode ? `• ${o.employeeCode}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="mb-1">
                          <OfferTypeBadge type={o.offerType} />
                        </div>
                        <div className="text-xs font-medium text-foreground">{o.designation}</div>
                        {o.department && <div className="text-[11px] text-muted-foreground">{o.department}</div>}
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        {isIntern ? (
                          <div>
                            <span className="font-bold text-foreground">
                              {(o.monthlyStipend ?? 0) > 0 ? `${formatCurrency(o.monthlyStipend)} / mo` : "Unpaid"}
                            </span>
                            {o.durationLabel && <div className="text-muted-foreground">{o.durationLabel}</div>}
                          </div>
                        ) : (
                          <div>
                            <span className="font-bold text-foreground">{formatCurrency(o.annualCtc)} / yr</span>
                            <div className="text-muted-foreground">Probation: {o.probationMonths ?? 6}m</div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">
                        <div>{isIntern ? "Start:" : "Joining:"} <span className="font-medium text-foreground">{o.joiningDate}</span></div>
                        {o.endDate && <div>End: <span className="font-medium text-foreground">{o.endDate}</span></div>}
                        {o.emailSent && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
                            <Mail className="h-3 w-3" /> Emailed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {canManage ? (
                          <select
                            value={o.status}
                            onChange={(e) =>
                              updateStatus.mutate({ id: o.id, status: e.target.value as OfferStatus })
                            }
                            className="rounded-lg border border-border bg-surface-elevated px-2 py-1 text-xs font-semibold text-foreground"
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <StatusBadge status={o.status} />
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDownload(o)}
                            disabled={downloadingId === o.id}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary-soft px-2.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition"
                          >
                            {downloadingId === o.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Download className="h-3.5 w-3.5" />
                            )}
                            PDF
                          </button>
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => handleDelete(o)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-danger hover:bg-danger/10 transition shadow-sm"
                              title="Delete Offer Letter"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
              <span>
                Page {meta.page + 1} of {meta.totalPages} ({meta.totalElements} total offers)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-md border border-border px-2.5 py-1 font-medium disabled:opacity-50 hover:bg-surface-elevated"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-md border border-border px-2.5 py-1 font-medium disabled:opacity-50 hover:bg-surface-elevated"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {createOpen && <CreateOfferDialog open={createOpen} onClose={() => setCreateOpen(false)} />}
    </div>
  );
}

function SummaryCard({ title, value, icon }: { title: string; value: string | number; icon: ReactNode }) {
  return (
    <Card className="p-4 flex items-center justify-between shadow-sm">
      <div className="space-y-1">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <div className="text-xl font-bold text-foreground">{value}</div>
      </div>
      <div className="rounded-xl bg-surface-muted p-2.5">{icon}</div>
    </Card>
  );
}

function CreateOfferDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const createOffer = useCreateOfferLetter();
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState<OfferLetterInput>({
    offerType: "FULL_TIME",
    employeeId: "",
    recipientName: "",
    employeeCode: "",
    recipientEmail: "",
    recipientPhone: "",
    recipientAddress: "",
    designation: "",
    department: "",
    location: "Jabalpur",
    reportingManager: "",
    issuedDate: today,
    joiningDate: today,
    endDate: "",
    durationLabel: "3 months",
    workingHours: "8 hours a day, Monday to Saturday, 10:30 - 7pm",
    probationMonths: 6,
    noticePeriod: "thirty (30) working days",
    monthlyBasic: 8000,
    monthlyHra: 1000,
    monthlyOtherAllowance: 1000,
    monthlyVariable: 0,
    monthlyStipend: 8000,
    directorName: "Mr. Abhinav Dubey",
    hrSignatoryName: "Ankita Verma",
    sendEmail: false,
  });

  const employeesQuery = useQuery({
    queryKey: ["offers", "employees", "lookup"],
    queryFn: () => hrService.lookupEmployees(),
  });
  const employees: EmployeeLookupItem[] = employeesQuery.data ?? [];

  function update<K extends keyof OfferLetterInput>(key: K, value: OfferLetterInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSelectEmployee(empIdStr: string) {
    if (!empIdStr) {
      update("employeeId", "");
      return;
    }
    const id = Number(empIdStr);
    const emp = employees.find((e) => e.id === id);
    if (emp) {
      setForm((prev) => ({
        ...prev,
        employeeId: id,
        recipientName: emp.name,
        employeeCode: emp.employeeCode,
        department: emp.departmentName ?? prev.department,
      }));
    }
  }

  const isIntern = form.offerType === "INTERNSHIP";
  const monthlyTotal =
    (Number(form.monthlyBasic) || 0) +
    (Number(form.monthlyHra) || 0) +
    (Number(form.monthlyOtherAllowance) || 0) +
    (Number(form.monthlyVariable) || 0);
  const annualTotal = monthlyTotal * 12;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.recipientName.trim()) {
      toast.error("Recipient name is required.");
      return;
    }
    if (!form.designation.trim()) {
      toast.error("Designation / role is required.");
      return;
    }
    if (!form.joiningDate) {
      toast.error("Joining / start date is required.");
      return;
    }

    try {
      const payload: OfferLetterInput = {
        ...form,
        employeeId: form.employeeId || undefined,
        probationMonths: form.probationMonths !== "" ? Number(form.probationMonths) : 6,
        monthlyBasic: Number(form.monthlyBasic) || 0,
        monthlyHra: Number(form.monthlyHra) || 0,
        monthlyOtherAllowance: Number(form.monthlyOtherAllowance) || 0,
        monthlyVariable: Number(form.monthlyVariable) || 0,
        monthlyStipend: Number(form.monthlyStipend) || 0,
      };
      await createOffer.mutateAsync(payload);
      toast.success("Offer letter generated successfully.");
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to generate offer letter."));
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Create Offer Letter">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto px-1 py-1">
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1.5">Offer Type</label>
          <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-border bg-surface-elevated p-1">
            {(
              [
                { value: "FULL_TIME", label: "Full-Time (Appointment)" },
                { value: "INTERNSHIP", label: "Internship Offer" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    offerType: opt.value,
                    noticePeriod: opt.value === "INTERNSHIP" ? "one week's" : "thirty (30) working days",
                  }))
                }
                className={`rounded-md py-1.5 text-xs font-semibold transition ${
                  form.offerType === opt.value
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">
            Prefill from Employee (Optional)
          </label>
          <Select
            value={form.employeeId ? String(form.employeeId) : ""}
            onChange={(e) => handleSelectEmployee(e.target.value)}
          >
            <option value="">Manual entry / New candidate...</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.employeeCode}) {emp.departmentName ? `— ${emp.departmentName}` : ""}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Recipient Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={form.recipientName}
              onChange={(e) => update("recipientName", e.target.value)}
              placeholder="e.g. Sourabh Patel"
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Employee Code</label>
            <input
              type="text"
              value={form.employeeCode ?? ""}
              onChange={(e) => update("employeeCode", e.target.value)}
              placeholder="e.g. MBG0697"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Email</label>
            <input
              type="email"
              value={form.recipientEmail ?? ""}
              onChange={(e) => update("recipientEmail", e.target.value)}
              placeholder="candidate@gmail.com"
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Mobile / Contact No.</label>
            <input
              type="text"
              value={form.recipientPhone ?? ""}
              onChange={(e) => update("recipientPhone", e.target.value)}
              placeholder="e.g. 8251081096"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">Address</label>
          <input
            type="text"
            value={form.recipientAddress ?? ""}
            onChange={(e) => update("recipientAddress", e.target.value)}
            placeholder="e.g. Vijay Nagar, Jabalpur"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              {isIntern ? "Internship Designation *" : "Designation *"}
            </label>
            <input
              type="text"
              value={form.designation}
              onChange={(e) => update("designation", e.target.value)}
              placeholder={isIntern ? "e.g. DIGITAL MARKETING Intern" : "e.g. Java Backend Developer"}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Department</label>
            <input
              type="text"
              value={form.department ?? ""}
              onChange={(e) => update("department", e.target.value)}
              placeholder="e.g. Java Developer / Marketing"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Location</label>
            <input
              type="text"
              value={form.location ?? ""}
              onChange={(e) => update("location", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              {isIntern ? "Supervisor / Mentor" : "Reporting Manager"}
            </label>
            <input
              type="text"
              value={form.reportingManager ?? ""}
              onChange={(e) => update("reportingManager", e.target.value)}
              placeholder={isIntern ? "e.g. Mr. Utkarsh Jain" : "e.g. Mr. Raj Koshta"}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              {isIntern ? "Start Date *" : "Joining Date *"}
            </label>
            <DatePicker
              value={form.joiningDate}
              onChange={(v) => update("joiningDate", v)}
              ariaLabel="Joining date"
            />
          </div>
          {isIntern ? (
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">End Date</label>
              <DatePicker
                value={form.endDate ?? ""}
                onChange={(v) => update("endDate", v)}
                ariaLabel="Internship end date"
              />
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Issued Date</label>
              <DatePicker
                value={form.issuedDate ?? ""}
                onChange={(v) => update("issuedDate", v)}
                ariaLabel="Issued date"
              />
            </div>
          )}
        </div>

        {isIntern ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Duration</label>
                <input
                  type="text"
                  value={form.durationLabel ?? ""}
                  onChange={(e) => update("durationLabel", e.target.value)}
                  placeholder="e.g. 3 months"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Monthly Stipend (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={form.monthlyStipend ?? ""}
                  onChange={(e) => update("monthlyStipend", e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="e.g. 8000 (0 for Unpaid)"
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Working Hours</label>
                <input
                  type="text"
                  value={form.workingHours ?? ""}
                  onChange={(e) => update("workingHours", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Notice Period</label>
                <input
                  type="text"
                  value={form.noticePeriod ?? ""}
                  onChange={(e) => update("noticePeriod", e.target.value)}
                  placeholder="e.g. one week's"
                  className={inputClass}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-border/80 bg-surface-muted/40 p-3.5 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-foreground">
              <span>Annexure A — Monthly Salary Breakup</span>
              <span className="text-primary">Annual CTC: {formatCurrency(annualTotal)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Basic (₹/mo)</label>
                <input
                  type="number"
                  min="0"
                  value={form.monthlyBasic ?? ""}
                  onChange={(e) => update("monthlyBasic", e.target.value === "" ? "" : Number(e.target.value))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">HRA (₹/mo)</label>
                <input
                  type="number"
                  min="0"
                  value={form.monthlyHra ?? ""}
                  onChange={(e) => update("monthlyHra", e.target.value === "" ? "" : Number(e.target.value))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Other Allowance (₹/mo)</label>
                <input
                  type="number"
                  min="0"
                  value={form.monthlyOtherAllowance ?? ""}
                  onChange={(e) => update("monthlyOtherAllowance", e.target.value === "" ? "" : Number(e.target.value))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Variable (₹/mo)</label>
                <input
                  type="number"
                  min="0"
                  value={form.monthlyVariable ?? ""}
                  onChange={(e) => update("monthlyVariable", e.target.value === "" ? "" : Number(e.target.value))}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Probation (Months)</label>
                <input
                  type="number"
                  min="0"
                  value={form.probationMonths ?? ""}
                  onChange={(e) => update("probationMonths", e.target.value === "" ? "" : Number(e.target.value))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Notice Period</label>
                <input
                  type="text"
                  value={form.noticePeriod ?? ""}
                  onChange={(e) => update("noticePeriod", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}

        <label className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-surface-muted/40 px-3 py-2.5 text-xs font-medium text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={form.sendEmail}
            onChange={(e) => update("sendEmail", e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          <Mail className="h-4 w-4 text-primary" />
          Send offer notification email to candidate
        </label>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface-elevated"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createOffer.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
          >
            {createOffer.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Generate Offer Letter
          </button>
        </div>
      </form>
    </Dialog>
  );
}
