import { Link } from "react-router-dom";
import { Bell, CalendarDays, Megaphone, ClipboardList, PartyPopper, ReceiptText, Star } from "lucide-react";

import { useAuth } from "@features/auth";
import { useAnnouncements } from "@features/announcements";
import { useLeaveRequests } from "@features/leave";
import { holidayService } from "@features/holidays";
import { payrollService } from "@features/payroll";
import { performanceService } from "@features/performance";
import { useMyProfile } from "@features/auth";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  EmptyState,
  PageHeader,
  StaggerContainer,
  StaggerItem,
  TableSkeleton,
} from "@shared/components/ui";
import { getApiErrorMessage } from "@shared/lib";
import { RefreshButton } from "@/components/ui/RefreshButton";

/** Dims one section while its query re-fetches in the background (not on first load). */
function refreshingClass(query: { isFetching: boolean; isLoading: boolean }): string {
  return query.isFetching && !query.isLoading ? "pointer-events-none opacity-60" : "";
}

const ANNOUNCEMENT_TONES: Record<string, string> = {
  GENERAL: "bg-primary-soft text-primary",
  HR: "bg-info-soft text-info",
  COMPANY: "bg-success-soft text-success",
  URGENT: "bg-danger-soft text-danger",
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function dateRange(start: string, end: string): string {
  const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${new Date(start).toLocaleDateString(undefined, options)} – ${new Date(end).toLocaleDateString(undefined, options)}`;
}

function periodLabel(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function formatMoney(value: string | number): string {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

const REVIEW_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function NotificationsPage() {
  const { role } = useAuth();
  const isHrRole = role === "ADMIN" || role === "HR" || role === "HR_HEAD" || role === "SUB_HR";

  const announcementsQuery = useAnnouncements({ active: true, size: 50, sort: "createdAt,desc" });
  const {
    data: announcementsData,
    isLoading: loadingAnnouncements,
    error: announcementsError,
  } = announcementsQuery;
  const announcements = announcementsData?.data ?? [];

  const leavesQuery = useLeaveRequests({
    status: "PENDING",
    scope: "accessible",
    size: 50,
    sort: "appliedDate,desc",
  });
  const {
    data: leavesData,
    isLoading: loadingLeaves,
    error: leavesError,
  } = leavesQuery;
  const pendingLeaves = isHrRole ? (leavesData?.data ?? []) : [];

  const holidaysQuery = useQuery({
    queryKey: ["notifications", "holidays"],
    queryFn: () => holidayService.list({ year: new Date().getFullYear(), active: true, size: 50 }),
  });
  const {
    data: holidaysData,
    isLoading: loadingHolidays,
    error: holidaysError,
  } = holidaysQuery;

  const upcomingHolidays = (holidaysData?.data ?? [])
    .filter((item) => new Date(`${item.holidayDate}T00:00:00`).getTime() >= Date.now() - 86_400_000)
    .sort((a, b) => a.holidayDate.localeCompare(b.holidayDate))
    .slice(0, 5);

  const { data: profile } = useMyProfile();
  const employeeId = profile?.id ?? 0;

  const payslipsQuery = useQuery({
    queryKey: ["notifications", "payslips", employeeId],
    queryFn: () => payrollService.employeePayslips(employeeId),
    enabled: employeeId > 0,
  });
  const {
    data: payslips,
    isLoading: loadingPayslips,
    error: payslipsError,
  } = payslipsQuery;

  const publishedPayslips = (payslips ?? [])
    .filter((item) => item.status === "PAID" || item.status === "PROCESSED")
    .sort((a, b) => b.payrollYear - a.payrollYear || b.payrollMonth - a.payrollMonth)
    .slice(0, 5);

  const reviewsQuery = useQuery({
    queryKey: ["notifications", "my-reviews"],
    queryFn: () => performanceService.myReviews(),
  });
  const {
    data: reviewsData,
    isLoading: loadingReviews,
    error: reviewsError,
  } = reviewsQuery;

  const myReviews = (reviewsData ?? [])
    .filter((item) => item.status !== "CANCELLED")
    .slice(0, 5);

  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem variant="card">
        <PageHeader
          title="Notifications"
          description="All your updates, announcements and pending approvals in one place."
        />
      </StaggerItem>

      {isHrRole ? (
        <StaggerItem variant="card">
        <Card padding="none" className={`overflow-hidden transition-opacity ${refreshingClass(leavesQuery)}`}>
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="flex items-center gap-2 font-extrabold text-card-foreground">
                <ClipboardList size={18} className="text-warning" />
                Pending Leave Requests
              </h2>
              <p className="text-sm text-muted-foreground">Requests waiting for your review.</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <RefreshButton
                onRefresh={() => leavesQuery.refetch()}
                isRefreshing={leavesQuery.isFetching}
                label="pending leave requests"
              />
              <Link
                to="/hrm/leave"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary-soft px-3 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/15"
              >
                Review leave
              </Link>
            </div>
          </div>

          {loadingLeaves ? (
            <div className="p-5">
              <TableSkeleton rows={4} />
            </div>
          ) : leavesError ? (
            <div className="p-10 text-center text-sm text-danger">
              {getApiErrorMessage(leavesError, "Failed to load pending leave requests.")}
            </div>
          ) : pendingLeaves.length === 0 ? (
            <div className="p-10">
              <EmptyState
                icon={CalendarDays}
                title="No pending leave requests"
                description="When an employee applies for leave, it will show up here for approval."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-muted text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Leave Type</th>
                    <th className="px-4 py-3">Dates</th>
                    <th className="px-4 py-3">Days</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Applied</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pendingLeaves.map((leave) => (
                    <tr key={leave.id} className="transition-colors hover:bg-surface-hover">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-card-foreground">{leave.employeeName}</p>
                        <p className="text-xs text-muted-foreground">
                          {leave.employeeCode}
                          {leave.employeeDepartment ? ` · ${leave.employeeDepartment}` : ""}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="inline-flex rounded-full bg-warning-soft px-2.5 py-1 text-xs font-bold text-warning">
                          {leave.leaveType}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-card-foreground">
                        {dateRange(leave.startDate, leave.endDate)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-card-foreground">
                        {leave.numberOfDays}
                      </td>
                      <td className="max-w-[240px] px-4 py-3">
                        <p className="truncate text-muted-foreground">
                          {leave.reason || "—"}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {formatDate(leave.appliedDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        </StaggerItem>
      ) : null}

      <StaggerItem variant="card">
      <Card padding="none" className={`overflow-hidden transition-opacity ${refreshingClass(holidaysQuery)}`}>
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 font-extrabold text-card-foreground">
              <PartyPopper size={18} className="text-success" />
              Upcoming Holidays
            </h2>
            <p className="text-sm text-muted-foreground">Next holidays added by HR.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <RefreshButton
              onRefresh={() => holidaysQuery.refetch()}
              isRefreshing={holidaysQuery.isFetching}
              label="upcoming holidays"
            />
            <Link
              to="/hrm/holidays"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary-soft px-3 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/15"
            >
              View all holidays
            </Link>
          </div>
        </div>

        {loadingHolidays ? (
          <div className="p-5">
            <TableSkeleton rows={4} />
          </div>
        ) : holidaysError ? (
          <div className="p-10 text-center text-sm text-danger">
            {getApiErrorMessage(holidaysError, "Failed to load holidays.")}
          </div>
        ) : upcomingHolidays.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={CalendarDays}
              title="No upcoming holidays"
              description="When HR adds a holiday, it will appear here."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Holiday</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {upcomingHolidays.map((holiday) => (
                  <tr key={holiday.id} className="transition-colors hover:bg-surface-hover">
                    <td className="whitespace-nowrap px-4 py-3 text-card-foreground">
                      {new Date(`${holiday.holidayDate}T00:00:00`).toLocaleDateString(undefined, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 font-semibold text-card-foreground">{holiday.name}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="inline-flex rounded-full bg-success-soft px-2.5 py-1 text-xs font-bold text-success">
                        {holiday.type}
                      </span>
                    </td>
                    <td className="max-w-[320px] px-4 py-3">
                      <p className="truncate text-muted-foreground">{holiday.description ?? "—"}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      </StaggerItem>

      <StaggerItem variant="card">
      <Card padding="none" className={`overflow-hidden transition-opacity ${refreshingClass(payslipsQuery)}`}>
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 font-extrabold text-card-foreground">
              <ReceiptText size={18} className="text-info" />
              My Payslips
            </h2>
            <p className="text-sm text-muted-foreground">Your published payslips.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <RefreshButton
              onRefresh={() => (employeeId > 0 ? payslipsQuery.refetch() : undefined)}
              isRefreshing={payslipsQuery.isFetching}
              label="payslips"
            />
            <Link
              to="/hrm/payslips"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary-soft px-3 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/15"
            >
              View payslips
            </Link>
          </div>
        </div>

        {loadingPayslips ? (
          <div className="p-5">
            <TableSkeleton rows={4} />
          </div>
        ) : payslipsError ? (
          <div className="p-10 text-center text-sm text-danger">
            {getApiErrorMessage(payslipsError, "Failed to load payslips.")}
          </div>
        ) : publishedPayslips.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={ReceiptText}
              title="No payslips yet"
              description="When HR publishes your monthly payslip, it will appear here."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Net pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {publishedPayslips.map((payslip) => (
                  <tr key={payslip.payrollId} className="transition-colors hover:bg-surface-hover">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-card-foreground">
                      {periodLabel(payslip.payrollMonth, payslip.payrollYear)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="inline-flex rounded-full bg-info-soft px-2.5 py-1 text-xs font-bold text-info">
                        {payslip.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-bold text-primary">
                      ₹ {formatMoney(payslip.netSalary)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      </StaggerItem>

      <StaggerItem variant="card">
      <Card padding="none" className={`overflow-hidden transition-opacity ${refreshingClass(reviewsQuery)}`}>
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 font-extrabold text-card-foreground">
              <Star size={18} className="text-warning" />
              My Performance Reviews
            </h2>
            <p className="text-sm text-muted-foreground">Reviews assigned to you by HR.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <RefreshButton
              onRefresh={() => reviewsQuery.refetch()}
              isRefreshing={reviewsQuery.isFetching}
              label="performance reviews"
            />
            <Link
              to="/hrm/performance"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary-soft px-3 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/15"
            >
              View reviews
            </Link>
          </div>
        </div>

        {loadingReviews ? (
          <div className="p-5">
            <TableSkeleton rows={4} />
          </div>
        ) : reviewsError ? (
          <div className="p-10 text-center text-sm text-danger">
            {getApiErrorMessage(reviewsError, "Failed to load performance reviews.")}
          </div>
        ) : myReviews.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={Star}
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
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {myReviews.map((review) => (
                  <tr key={review.id} className="transition-colors hover:bg-surface-hover">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-card-foreground">
                      {review.cycle}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-card-foreground">
                      {dateRange(review.periodStart, review.periodEnd)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{review.reviewerName}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="inline-flex rounded-full bg-warning-soft px-2.5 py-1 text-xs font-bold text-warning">
                        {REVIEW_STATUS_LABELS[review.status] ?? review.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card padding="none" className={`overflow-hidden transition-opacity ${refreshingClass(announcementsQuery)}`}>
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 font-extrabold text-card-foreground">
              <Megaphone size={18} className="text-primary" />
              Announcements &amp; HR Updates
            </h2>
            <p className="text-sm text-muted-foreground">Company notices, holidays and updates.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <RefreshButton
              onRefresh={() => announcementsQuery.refetch()}
              isRefreshing={announcementsQuery.isFetching}
              label="announcements"
            />
            <Link
              to="/hrm/announcements"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary-soft px-3 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/15"
            >
              View all announcements
            </Link>
          </div>
        </div>

        {loadingAnnouncements ? (
          <div className="p-5">
            <TableSkeleton rows={5} />
          </div>
        ) : announcementsError ? (
          <div className="p-10 text-center text-sm text-danger">
            {getApiErrorMessage(announcementsError, "Failed to load announcements.")}
          </div>
        ) : announcements.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={Bell}
              title="No announcements yet"
              description="New company announcements and updates will appear here."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Announcement</th>
                  <th className="px-4 py-3">Audience</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Posted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {announcements.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-surface-hover">
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
                          ANNOUNCEMENT_TONES[item.type] ?? "bg-primary-soft text-primary"
                        }`}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-card-foreground">{item.title}</p>
                      {item.content ? (
                        <p className="mt-1 line-clamp-2 max-w-[440px] text-xs text-muted-foreground">
                          {item.content}
                        </p>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-card-foreground">
                      {item.targetAudience ?? "Everyone"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                          item.active
                            ? "bg-success-soft text-success"
                            : "bg-surface-muted text-muted-foreground"
                        }`}
                      >
                        {item.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {item.createdAt ? formatDate(item.createdAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      </StaggerItem>
    </StaggerContainer>
  );
}