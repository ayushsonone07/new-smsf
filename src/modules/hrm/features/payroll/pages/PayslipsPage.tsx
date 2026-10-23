import { useState } from "react";

import { Building2, Download, FileText } from "lucide-react";

import { useMyProfile } from "@features/auth";
import { useToast } from "@shared/components/feedback";
import { ErrorDisplay, EmptyState, PageHeader, Card, Skeleton } from "@shared/components/ui";
import { getApiErrorMessage } from "@shared/lib";

import { PayrollStatusBadge } from "../components/PayrollStatusBadge";
import { PayslipDownloadButton } from "../components/PayrollTable";
import { useEmployeePayslips } from "../hooks";
import { formatMoney, formatDate, periodLabel, triggerBlobDownload } from "../lib/payrollFormat";
import { payrollService } from "../services";

import type { PayslipDetails } from "../types";

export function PayslipsPage() {
  const { data: profile } = useMyProfile();
  const employeeId = profile?.id ?? 0;

  const { data: payslips, isLoading, error } = useEmployeePayslips(employeeId);

  const [downloadingId, setDownloadingId] = useState<number | null>(null);
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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Self service"
        title="My Payslips"
        description="Download your monthly payslips as PDFs."
      />

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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                <PayslipDownloadButton
                  onDownload={() => void handleDownload(payslip)}
                  downloading={downloadingId === payslip.payrollId}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Download className="h-3.5 w-3.5" />
        The first download generates and stores the PDF; later downloads reuse it.
      </p>
    </div>
  );
}
