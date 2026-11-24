import { useState } from "react";

import { Building2, Download, Eye, FileText } from "lucide-react";

import { useMyProfile } from "@features/auth";
import { useToast } from "@shared/components/feedback";
import { ErrorDisplay, EmptyState, Card, Skeleton } from "@shared/components/ui";
import { getApiErrorMessage } from "@shared/lib";
import { RefreshButton } from "@/components/ui/RefreshButton";

import { PayrollStatusBadge } from "../components/PayrollStatusBadge";
import { PayslipDownloadButton } from "../components/PayrollTable";
import { PayslipModal } from "../components/PayslipModal";
import { useEmployeePayslips } from "../hooks";
import { formatMoney, formatDate, periodLabel, triggerBlobDownload } from "../lib/payrollFormat";
import { payrollService } from "../services";

import type { PayslipDetails } from "../types";

export function PayslipsPage() {
  const { data: profile } = useMyProfile();
  const employeeId = profile?.id ?? 0;

  const payslipsQuery = useEmployeePayslips(employeeId);
  const { data: payslips, isLoading, error } = payslipsQuery;
  const payslipsRefreshing = payslipsQuery.isFetching && !isLoading;

  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [viewingSlip, setViewingSlip] = useState<PayslipDetails | null>(null);
  const toast = useToast();

  async function handleDownload(payslip: PayslipDetails) {
    setDownloadingId(payslip.payrollId);
    try {
      const blob = await payrollService.downloadPayslipPdf(payslip.payrollId);
      const filename =
        payslip.payslipNumber && payslip.payslipNumber !== "-"
          ? `${payslip.payslipNumber}.pdf`
          : `payslip-${payslip.payrollId}.pdf`;
      triggerBlobDownload(blob, filename);
      toast.success("Payslip downloaded.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not download the payslip. Please try again."));
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Top action row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <FileText size={15} className="text-primary" />
          <span>My Payslips {payslips && payslips.length > 0 ? `(${payslips.length})` : ""}</span>
        </div>
        <RefreshButton
          onRefresh={() => (employeeId > 0 ? payslipsQuery.refetch() : undefined)}
          isRefreshing={payslipsQuery.isFetching}
          label="payslips"
          className="h-9 w-9 rounded-xl"
        />
      </div>

      {error ? (
        <ErrorDisplay message={getApiErrorMessage(error, "Failed to load payslips.")} />
      ) : null}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : !payslips || payslips.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No payslips yet"
          description="Payslips appear here once payroll is generated for your months. Ask your HR team if you expected a payslip."
        />
      ) : (
        <div
          className={`grid grid-cols-1 gap-4 transition-opacity md:grid-cols-2 xl:grid-cols-3 ${
            payslipsRefreshing ? "pointer-events-none opacity-60" : ""
          }`}
          aria-busy={payslipsRefreshing}
        >
          {payslips.map((payslip) => (
            <Card key={payslip.payrollId} padding="lg" className="flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft">
                    <Building2 className="h-5 w-5 text-primary" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {periodLabel(payslip.payrollMonth, payslip.payrollYear)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {payslip.employeeCode} · {payslip.departmentName ?? "No department"}
                    </p>
                  </div>
                </div>
                <PayrollStatusBadge status={payslip.status} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Gross</p>
                  <p className="font-semibold text-foreground">
                    ₹ {formatMoney(payslip.totalEarnings)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Deductions</p>
                  <p className="font-semibold text-foreground">
                    − ₹ {formatMoney(payslip.totalDeductions)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Working / half days</p>
                  <p className="font-semibold text-foreground">
                    {payslip.workingDays} / {payslip.halfDayAttendance}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Net pay</p>
                  <p className="text-base font-bold text-primary">
                    ₹ {formatMoney(payslip.netSalary)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">
                  {payslip.payslipNumber && payslip.payslipNumber !== "-"
                    ? payslip.payslipNumber
                    : "Generated on demand"}
                  {payslip.paymentDate ? ` · ${formatDate(payslip.paymentDate)}` : ""}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewingSlip(payslip)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-elevated px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </button>
                  <PayslipDownloadButton
                    onDownload={() => void handleDownload(payslip)}
                    downloading={downloadingId === payslip.payrollId}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <PayslipModal
        open={!!viewingSlip}
        payslip={viewingSlip}
        onClose={() => setViewingSlip(null)}
        onDownload={viewingSlip ? () => void handleDownload(viewingSlip) : undefined}
        isDownloading={viewingSlip ? downloadingId === viewingSlip.payrollId : false}
      />

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Download className="h-3.5 w-3.5" />
        The first download generates and stores the PDF; later downloads reuse it.
      </p>
    </div>
  );
}
