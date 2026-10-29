import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { useQuery } from "@tanstack/react-query";
import { Edit3, Loader2, Plus, Search, Star, Target } from "lucide-react";

import { useAuth } from "@features/auth";
import type { EmployeeListItem } from "@features/hr";
import { hrService } from "@features/hr/services";
import { useToast } from "@shared/components/feedback";
import {
  AnimatedFilterSelect,
  Card,
  DatePicker,
  Dialog,
  EmptyState,
  PageHeader,
  TableSkeleton,
} from "@shared/components/ui";
import { getApiErrorMessage } from "@shared/lib";
import { Select } from "@hrm/components/ui/select";
import { RefreshButton } from "@/components/ui/RefreshButton";

import { useDepartments, useDesignations } from "@features/hr/hooks";
import {
  useCompletePerformanceReview,
  useCreatePerformanceReview,
  usePerformanceReviews,
  usePerformanceSummary,
  useUpdatePerformanceReview,
} from "../hooks";
import { performanceService } from "../services";

import type { PerformanceReview, PerformanceReviewInput, PerformanceReviewStatus } from "../types";

const STATUS_OPTIONS: Array<{ value: PerformanceReviewStatus; label: string; tone: string }> = [
  { value: "PENDING", label: "Pending", tone: "border-warning bg-warning-soft text-warning" },
  { value: "IN_PROGRESS", label: "In Progress", tone: "border-info bg-info-soft text-info" },
  {
    value: "COMPLETED",
    label: "Completed",
    tone: "border-success bg-success-soft text-success",
  },
  { value: "CANCELLED", label: "Cancelled", tone: "border-border bg-surface-muted text-muted-foreground" },
];

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-surface-elevated px-3 text-sm font-medium text-foreground shadow outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60";

export function PerformancePage() {
  const { role } = useAuth();
  const canManage = role === "ADMIN" || role === "HR" || role === "HR_HEAD";
  const isEmployee = role === "EMPLOYEE";
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<PerformanceReviewStatus | "">("");
  const [cycle, setCycle] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PerformanceReview | null>(null);

  const myReviews = useQuery({
    queryKey: ["performance", "my-reviews"],
    queryFn: () => performanceService.myReviews(),
    enabled: isEmployee,
  });

const summary = usePerformanceSummary(!isEmployee);
  const reviews = usePerformanceReviews(
    {
      page,
      size: 10,
      status,
      cycle,
      employeeSearch,
      sort: "createdAt,desc",
    },
    !isEmployee,
  );
  const completeReview = useCompletePerformanceReview();

  if (isEmployee) {
    const myRecords = myReviews.data ?? [];
    return (
      <div className="space-y-6">
        <PageHeader
          title="Performance"
          description="Your performance reviews."
          actions={
            <RefreshButton
              onRefresh={() => myReviews.refetch()}
              isRefreshing={myReviews.isFetching}
              label="performance reviews"
              className="h-10 w-10 rounded-xl"
            />
          }
        />
        <Card
          padding="none"
          className={`overflow-hidden transition-opacity ${
            myReviews.isFetching && !myReviews.isLoading ? "pointer-events-none opacity-60" : ""
          }`}
        >
          {myReviews.isLoading ? (
            <div className="p-5">
              <TableSkeleton rows={6} />
            </div>
          ) : myReviews.error ? (
            <div className="p-10 text-center text-sm text-danger">
              {getApiErrorMessage(myReviews.error, "Failed to load your performance reviews.")}
            </div>
          ) : myRecords.length === 0 ? (
            <div className="p-10">
              <EmptyState
                icon={Target}
                title="No performance reviews"
                description="When HR assigns you a performance review, it will appear here."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-muted text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">Cycle</th>
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3">Reviewer</th>
                    <th className="px-4 py-3">Rating</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {myRecords.map((review) => (
                    <tr key={review.id} className="hover:bg-surface-hover/70">
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-foreground">
                        {review.cycle}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {formatDate(review.periodStart)} - {formatDate(review.periodEnd)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-foreground">{review.reviewerName}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-foreground">
                        {review.rating ? `${review.rating}/5` : "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusBadge status={review.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    );
  }

  const records = reviews.data?.data ?? [];
  const totalPages = reviews.data?.meta.totalPages ?? 1;

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(review: PerformanceReview) {
    setEditing(review);
    setDialogOpen(true);
  }

  function complete(review: PerformanceReview) {
    completeReview.mutate(review.id, {
      onSuccess: () => toast.success("Review completed."),
      onError: (err) => toast.error(getApiErrorMessage(err, "Failed to complete review.")),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance"
        description="Create reviews, track progress, and complete employee performance evaluations."
        actions={
          canManage ? (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-all hover:brightness-110"
            >
              <Plus size={18} />
              Create Review
            </button>
          ) : undefined
        }
      />

      <div
        className={`grid gap-4 transition-opacity md:grid-cols-5 ${
          summary.isFetching && !summary.isLoading ? "pointer-events-none opacity-60" : ""
        }`}
      >
        <Metric label="Total" value={summary.data?.totalReviews ?? 0} />
        <Metric label="Pending" value={summary.data?.pendingReviews ?? 0} tone="amber" />
        <Metric label="In Progress" value={summary.data?.inProgressReviews ?? 0} tone="sky" />
        <Metric label="Completed" value={summary.data?.completedReviews ?? 0} tone="emerald" />
        <Metric
          label="Avg Rating"
          value={(summary.data?.averageRating ?? 0).toFixed(1)}
          icon={<Star size={16} />}
        />
      </div>

      <Card padding="md">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={employeeSearch}
              onChange={(event) => {
                setEmployeeSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search employee, code, department..."
              className={`${inputClass} pl-9`}
            />
          </label>
          <div className="grid w-full grid-cols-2 gap-3 lg:w-[360px] lg:shrink-0">
            <AnimatedFilterSelect
              value={status}
              onValueChange={(nextStatus) => {
                setStatus(nextStatus as PerformanceReviewStatus | "");
                setPage(1);
              }}
              options={[
                { value: "", label: "Status" },
                ...STATUS_OPTIONS.map((item) => ({
                  value: item.value,
                  label: item.label,
                })),
              ]}
              ariaLabel="Filter performance reviews by status"
            />
            <input
              value={cycle}
              onChange={(event) => {
                setCycle(event.target.value);
                setPage(1);
              }}
              placeholder="Cycle e.g. Q1 2026"
              className={inputClass}
            />
          </div>
          <RefreshButton
            onRefresh={() => Promise.all([reviews.refetch(), summary.refetch()])}
            isRefreshing={reviews.isFetching || summary.isFetching}
            label="performance reviews"
            className="h-10 w-10 shrink-0 self-end rounded-xl lg:self-auto"
          />
        </div>
      </Card>

      <Card
        padding="none"
        className={`overflow-hidden transition-opacity ${
          reviews.isFetching && !reviews.isLoading ? "pointer-events-none opacity-60" : ""
        }`}
      >
        {reviews.isLoading ? (
          <div className="p-5">
            <TableSkeleton rows={6} />
          </div>
        ) : reviews.error ? (
          <div className="p-10 text-center text-sm text-danger">
            {getApiErrorMessage(reviews.error, "Failed to load performance reviews.")}
          </div>
        ) : records.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={Target}
              title="No performance reviews"
              description="Create reviews to track employee performance here."
            />
          </div>
        ) : (
          <PerformanceTable
            records={records}
            canManage={canManage}
            pending={completeReview.isPending}
            onEdit={openEdit}
            onComplete={complete}
          />
        )}
      </Card>

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold disabled:opacity-60"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold disabled:opacity-60"
          >
            Next
          </button>
        </div>
      ) : null}

      <PerformanceDialog open={dialogOpen} review={editing} onClose={() => setDialogOpen(false)} />
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "default",
  icon,
}: {
  label: string;
  value: string | number;
  tone?: "default" | "amber" | "sky" | "emerald";
  icon?: ReactNode;
}) {
  const color =
    tone === "amber"
      ? "text-warning"
      : tone === "sky"
        ? "text-info"
        : tone === "emerald"
          ? "text-success"
          : "text-foreground";
  return (
    <Card padding="md">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-2 flex items-center gap-2 text-2xl font-extrabold ${color}`}>
        {icon}
        {value}
      </p>
    </Card>
  );
}

function PerformanceTable({
  records,
  canManage,
  pending,
  onEdit,
  onComplete,
}: {
  records: PerformanceReview[];
  canManage: boolean;
  pending: boolean;
  onEdit: (review: PerformanceReview) => void;
  onComplete: (review: PerformanceReview) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-gray-50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3">Employee</th>
            <th className="px-4 py-3">Reviewer</th>
            <th className="px-4 py-3">Cycle</th>
            <th className="px-4 py-3">Period</th>
            <th className="px-4 py-3">Rating</th>
            <th className="px-4 py-3">Status</th>
            {canManage ? <th className="px-4 py-3 text-right">Actions</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {records.map((review) => (
            <tr key={review.id} className="hover:bg-surface-hover/70">
              <td className="px-4 py-3">
                <p className="font-semibold text-foreground">{review.employeeName}</p>
                <p className="text-xs text-muted-foreground">
                  {review.employeeCode} - {review.employeeDepartment ?? "No department"}
                </p>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-foreground">{review.reviewerName}</td>
              <td className="whitespace-nowrap px-4 py-3 font-semibold text-foreground">
                {review.cycle}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                {formatDate(review.periodStart)} - {formatDate(review.periodEnd)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-foreground">
                {review.rating ? `${review.rating}/5` : "-"}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <StatusBadge status={review.status} />
              </td>
              {canManage ? (
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <div className="inline-flex gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(review)}
                      className="rounded-lg border border-info/30 bg-info-soft p-1.5 text-info hover:bg-info-soft/80"
                      aria-label="Edit review"
                    >
                      <Edit3 size={15} />
                    </button>
                    {review.status !== "COMPLETED" ? (
                      <button
                        type="button"
                        onClick={() => onComplete(review)}
                        disabled={pending}
                        className="rounded-lg border border-success/30 bg-success-soft px-3 py-1.5 text-xs font-semibold text-success hover:bg-success-soft/80 disabled:opacity-60"
                      >
                        Complete
                      </button>
                    ) : null}
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: PerformanceReviewStatus }) {
  const meta = STATUS_OPTIONS.find((item) => item.value === status) ?? STATUS_OPTIONS[0]!;
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.tone}`}
    >
      {meta.label}
    </span>
  );
}

function PerformanceDialog({
  open,
  review,
  onClose,
}: {
  open: boolean;
  review: PerformanceReview | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const createReview = useCreatePerformanceReview();
  const updateReview = useUpdatePerformanceReview();
  const isEditing = Boolean(review);
  const [form, setForm] = useState<PerformanceReviewInput>(() =>
    review ? toInput(review) : emptyInput(),
  );
  const [departmentId, setDepartmentId] = useState(0);
  const [designationId, setDesignationId] = useState(0);
  const departments = useDepartments(open);
  const designations = useDesignations(open);
  const departmentItems = departments.data ?? [];
  const designationItems = designations.data ?? [];

  const employees = useQuery({
    queryKey: ["performance", "employees"],
    queryFn: () =>
      hrService
        .listEmployees({ page: 0, size: 100, status: "active", sort: "employeeCode,asc" })
        .then((r) => r.items),
  });
  const employeeItems = (employees.data ?? []).filter(
    (employee) => employee.status === "active",
  );
  const filteredDesignations = departmentId
    ? designationItems.filter(
        (designation) =>
          designation.departmentId == null || designation.departmentId === departmentId,
      )
    : designationItems;
  const filteredEmployeeOptions = employeeItems.filter((employee) => {
    if (departmentId && employee.departmentId && employee.departmentId !== departmentId) return false;
    if (designationId && employee.designationId && employee.designationId !== designationId) return false;
    return true;
  });

  useEffect(() => {
    if (open) {
      setForm(review ? toInput(review) : emptyInput());
      setDepartmentId(0);
      setDesignationId(0);
    }
  }, [open, review]);

  useEffect(() => {
    if (!open || !review) return;
    const employee = (employees.data ?? []).find((option) => option.id === review.employeeId);
    setDepartmentId(employee?.departmentId ?? 0);
    setDesignationId(employee?.designationId ?? 0);
  }, [employees.data, open, review]);

  const pending = createReview.isPending || updateReview.isPending;
  const lookupsRefreshing =
    (departments.isFetching && !departments.isLoading) ||
    (designations.isFetching && !designations.isLoading) ||
    (employees.isFetching && !employees.isLoading);

  function update<K extends keyof PerformanceReviewInput>(
    key: K,
    value: PerformanceReviewInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const input = sanitizeInput(form);
    const callbacks = {
      onSuccess: () => {
        toast.success(isEditing ? "Performance review updated." : "Performance review created.");
        onClose();
      },
      onError: (err: Error) =>
        toast.error(
          getApiErrorMessage(
            err,
            isEditing ? "Failed to update review." : "Failed to create review.",
          ),
        ),
    };
    if (review) updateReview.mutate({ id: review.id, input }, callbacks);
    else createReview.mutate(input, callbacks);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Review" : "Create Review"}
      description="Assign a reviewer and track goals, rating, and comments."
      size="lg"
      headerActions={
        <RefreshButton
          onRefresh={() => Promise.all([departments.refetch(), designations.refetch(), employees.refetch()])}
          isRefreshing={departments.isFetching || designations.isFetching || employees.isFetching}
          label="departments, designations and employees"
        />
      }
    >
      <form onSubmit={submit} className="space-y-5">
        <div
          className={`grid gap-4 transition-opacity sm:grid-cols-2 ${lookupsRefreshing ? "opacity-60" : ""}`}
          aria-busy={lookupsRefreshing}
        >
          <Field label="Department" required>
            <Select
              value={departmentId || ""}
              onChange={(event) => {
                setDepartmentId(Number(event.target.value));
                setDesignationId(0);
                update("employeeId", 0);
              }}
              required
              disabled={departments.isLoading}
              className={inputClass}
            >
              <option value="">Select department</option>
              {departmentItems.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Designation" required>
            <Select
              value={designationId || ""}
              onChange={(event) => {
                setDesignationId(Number(event.target.value));
                update("employeeId", 0);
              }}
              required
              disabled={designations.isLoading || !departmentId}
              className={inputClass}
            >
              <option value="">Select designation</option>
              {filteredDesignations.map((des) => (
                <option key={des.id} value={des.id}>
                  {des.title}
                </option>
              ))}
            </Select>
          </Field>
          <SelectEmployee
            label="Employee"
            value={form.employeeId}
            employees={filteredEmployeeOptions}
            disabled={employees.isLoading}
            className={inputClass}
            onChange={(id) => {
              update("employeeId", id);
              const employee = employeeItems.find((option) => option.id === id);
              if (employee?.departmentId) setDepartmentId(employee.departmentId);
              if (employee?.designationId) setDesignationId(employee.designationId);
            }}
          />
          <SelectEmployee
            label="Reviewer"
            value={form.reviewerId}
            employees={(employees.data ?? []).filter((employee) =>
              ["hr", "admin", "manager", "sub_hr"].includes(employee.role),
            )}
            disabled={employees.isLoading}
            className={inputClass}
            onChange={(id) => update("reviewerId", id)}
          />
          <Field label="Cycle" required>
            <input
              value={form.cycle}
              onChange={(event) => update("cycle", event.target.value)}
              required
              placeholder="Q1 2026"
              className={inputClass}
            />
          </Field>
          <Field label="Status">
            <Select
              value={form.status ?? "PENDING"}
              onChange={(event) => update("status", event.target.value as PerformanceReviewStatus)}
              className={inputClass}
            >
              {STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Period start" required>
            <DatePicker
              value={form.periodStart}
              onChange={(value) => update("periodStart", value)}
              required
              ariaLabel="Choose review period start"
              buttonClassName={inputClass}
            />
          </Field>
          <Field label="Period end" required>
            <DatePicker
              value={form.periodEnd}
              onChange={(value) => update("periodEnd", value)}
              required
              ariaLabel="Choose review period end"
              buttonClassName={inputClass}
            />
          </Field>
        </div>
        <Field label="Goals / KRA" required>
          <textarea
            value={form.goals}
            onChange={(event) => update("goals", event.target.value)}
            required
            rows={3}
            className={`${inputClass} min-h-24 resize-none py-3`}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rating" required>
            <input
              type="number"
              min="1"
              max="5"
              step="0.5"
              required={form.status === "COMPLETED"}
              value={form.rating ?? ""}
              onChange={(event) =>
                update("rating", event.target.value ? Number(event.target.value) : null)
              }
              className={inputClass}
            />
          </Field>
          <Field label="Comments" required>
            <input
              value={form.comments ?? ""}
              onChange={(event) => update("comments", event.target.value)}
              required={form.status === "COMPLETED"}
              placeholder="Required before completion"
              className={inputClass}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Strengths">
            <textarea
              value={form.strengths ?? ""}
              onChange={(event) => update("strengths", event.target.value)}
              rows={3}
              className={`${inputClass} min-h-24 resize-none py-3`}
            />
          </Field>
          <Field label="Improvement areas">
            <textarea
              value={form.improvements ?? ""}
              onChange={(event) => update("improvements", event.target.value)}
              rows={3}
              className={`${inputClass} min-h-24 resize-none py-3`}
            />
          </Field>
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface-elevated px-5 text-sm font-semibold text-foreground hover:bg-surface-hover disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {pending ? <Loader2 size={16} className="animate-spin" /> : null}
            {isEditing ? "Update Review" : "Create Review"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function SelectEmployee({
  label,
  value,
  employees,
  disabled,
  onChange,
  className,
}: {
  label: string;
  value: number;
  employees: EmployeeListItem[];
  disabled: boolean;
  className: string;
  onChange: (id: number) => void;
}) {
  return (
    <Field label={label} required>
      <Select
        value={value || ""}
        onChange={(event) => onChange(Number(event.target.value))}
        required
        disabled={disabled}
        className={className}
      >
        <option value="">Select {label.toLowerCase()}</option>
        {employees.map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employee.name} — {employee.employeeCode}
          </option>
        ))}
      </Select>
    </Field>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm font-semibold text-foreground">
      <span className="mb-1.5 block">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function emptyInput(): PerformanceReviewInput {
  const today = new Date();
  const start = new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const end = new Date(today.getFullYear(), 11, 31).toISOString().slice(0, 10);
  return {
    employeeId: 0,
    reviewerId: 0,
    cycle: `Annual ${today.getFullYear()}`,
    periodStart: start,
    periodEnd: end,
    goals: "",
    rating: null,
    strengths: "",
    improvements: "",
    comments: "",
    status: "PENDING",
  };
}

function toInput(review: PerformanceReview): PerformanceReviewInput {
  return {
    employeeId: review.employeeId,
    reviewerId: review.reviewerId,
    cycle: review.cycle,
    periodStart: review.periodStart,
    periodEnd: review.periodEnd,
    goals: review.goals,
    rating: review.rating ?? null,
    strengths: review.strengths ?? "",
    improvements: review.improvements ?? "",
    comments: review.comments ?? "",
    status: review.status,
  };
}

function sanitizeInput(input: PerformanceReviewInput): PerformanceReviewInput {
  return {
    ...input,
    cycle: input.cycle.trim(),
    goals: input.goals.trim(),
    strengths: input.strengths?.trim() || null,
    improvements: input.improvements?.trim() || null,
    comments: input.comments?.trim() || null,
  };
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}
