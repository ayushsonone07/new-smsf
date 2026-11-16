import { Eye, Download } from "lucide-react";

import { Dialog } from "@shared/components/ui";
import { formatMoney, monthName } from "../lib/payrollFormat";
import type { PayslipDetails } from "../types";

interface PayslipModalProps {
  open: boolean;
  payslip: PayslipDetails | null;
  onClose: () => void;
  onDownload?: () => void;
  isDownloading?: boolean;
}

export function PayslipModal({
  open,
  payslip,
  onClose,
  onDownload,
  isDownloading,
}: PayslipModalProps) {
  if (!payslip) return null;

  const isIntern =
    payslip.earnings?.some((e) => e.earningType === "STIPEND") ?? false;

  const basic =
    payslip.earnings?.find((e) => e.earningType === "BASIC")?.amount ?? "0";
  const hra =
    payslip.earnings?.find((e) => e.earningType === "HRA")?.amount ?? "0";
  const special =
    payslip.earnings?.find((e) => e.earningType === "SPECIAL_ALLOWANCE")
      ?.amount ?? "0";
  const other =
    payslip.earnings?.find((e) => e.earningType === "OTHER")?.amount ?? "0";
  const incentive =
    payslip.earnings?.find((e) => e.earningType === "INCENTIVE")?.amount ?? "0";
  const stipend =
    payslip.earnings?.find((e) => e.earningType === "STIPEND")?.amount ?? "0";

  const leaveDeduction = (
    parseFloat(payslip.deductions?.find((d) => d.deductionType === "UNPAID_LEAVE")?.amount ?? "0") +
    parseFloat(payslip.deductions?.find((d) => d.deductionType === "ABSENT")?.amount ?? "0") +
    parseFloat(payslip.deductions?.find((d) => d.deductionType === "HALF_DAY")?.amount ?? "0")
  ).toFixed(2);
  const pf =
    payslip.deductions?.find((d) => d.deductionType === "PF")?.amount ?? "0";
  const esic =
    payslip.deductions?.find((d) => d.deductionType === "ESI")?.amount ?? "0";

  const periodStr = `${monthName(payslip.payrollMonth)} ${payslip.payrollYear}`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Salary Slip Preview"
      size="xl"
      headerActions={
        onDownload ? (
          <button
            type="button"
            onClick={onDownload}
            disabled={isDownloading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-primary-hover disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {isDownloading ? "Downloading..." : "Download PDF"}
          </button>
        ) : undefined
      }
    >
      <div className="max-h-[80vh] overflow-y-auto p-6 text-slate-800">
        {/* Printable / Template Card Frame */}
        <div className="mx-auto max-w-3xl rounded-xl border border-slate-300 bg-white p-8 shadow-sm">
          {/* Header Grid: Left/Center area (10 cols) and Right Logo (2 cols) */}
          <div className="grid grid-cols-12 gap-4 pb-4">
            <div className="col-span-10">
              {/* Company Name at the very top (Centered) */}
              <div className="mb-2.5 text-center">
                <h2 className="text-base font-bold uppercase tracking-tight text-slate-900">
                  {payslip.companyName || "MBG CARD INDIA PVT. LTD."}
                </h2>
              </div>

              {/* Address, Contact No, Email directly under Company Name */}
              <div className="text-xs leading-relaxed text-slate-700">
                <div className="grid grid-cols-[90px_1fr] gap-x-2">
                  <span className="font-bold text-slate-900">Address</span>
                  <span>
                    {payslip.companyAddress || (
                      <>
                        1st floor, Madan Mahal Railway Station
                        <br />
                        Wright Town, Jabalpur, M.P. 482002
                      </>
                    )}
                  </span>
                  <span className="mt-1 font-bold text-slate-900">Contact No.</span>
                  <span className="mt-1">{payslip.companyPhone || "8878441831"}</span>
                  <span className="mt-0.5 font-bold text-slate-900">Email</span>
                  <span className="mt-0.5 text-primary">{payslip.companyEmail || "hr@mbgcard.com"}</span>
                </div>
              </div>
            </div>

            {/* Right: Logo */}
            <div className="col-span-2 flex justify-end items-start pt-1">
              <img
                src="/assets/mbg-logo.jpg"
                alt="MBG Logo"
                className="h-16 w-auto object-contain"
                onError={(e) => {
                  // Fallback to svg if jpg not yet served
                  e.currentTarget.src = "/mbg-card-logo.svg";
                }}
              />
            </div>
          </div>

          {/* Subtitle */}
          <div className="my-3 text-center">
            <h3 className="text-base font-medium text-slate-900">
              {isIntern
                ? `Internship Stipend Slip for the month of ${periodStr}`
                : `Pay slip for the month of ${periodStr}`}
            </h3>
          </div>

          {/* Box 1: Employee Details */}
          <div className="overflow-hidden rounded border border-slate-900 text-xs">
            <div className="grid grid-cols-[180px_1fr] border-b border-slate-900">
              <div className="border-r border-slate-900 px-3 py-1.5 font-bold">
                Employee Name
              </div>
              <div className="px-3 py-1.5 font-medium">{payslip.employeeName}</div>
            </div>
            <div className="grid grid-cols-[180px_1fr] border-b border-slate-900">
              <div className="border-r border-slate-900 px-3 py-1.5 font-bold">
                Designation
              </div>
              <div className="px-3 py-1.5 font-medium">
                {payslip.designationTitle ?? "-"}
              </div>
            </div>
            <div className="grid grid-cols-[180px_1fr] border-b border-slate-900">
              <div className="border-r border-slate-900 px-3 py-1.5 font-bold">
                Department
              </div>
              <div className="px-3 py-1.5 font-medium">
                {payslip.departmentName ?? "-"}
              </div>
            </div>
            <div className="grid grid-cols-[180px_1fr]">
              <div className="border-r border-slate-900 px-3 py-1.5 font-bold">
                Location
              </div>
              <div className="px-3 py-1.5 font-medium">
                {payslip.location ?? "Jabalpur"}
              </div>
            </div>
          </div>

          {/* Box 2: Dates, Bank & Attendance */}
          <div className="mt-3 overflow-hidden rounded border border-slate-900 text-xs">
            {/* Row 1 */}
            <div className="grid grid-cols-[180px_1fr_160px_1fr] border-b border-slate-900">
              <div className="border-r border-slate-900 px-3 py-1.5 font-bold">Date</div>
              <div className="border-r border-slate-900 px-3 py-1.5">
                {payslip.payslipDate ?? new Date().toLocaleDateString("en-IN")}
              </div>
              <div className="border-r border-slate-900 px-3 py-1.5 font-bold">
                Employee Code
              </div>
              <div className="px-3 py-1.5">{payslip.employeeCode}</div>
            </div>
            {/* Row 2 */}
            <div className="grid grid-cols-[180px_1fr_160px_1fr] border-b border-slate-900">
              <div className="border-r border-slate-900 px-3 py-1.5 font-bold">PAN</div>
              <div className="border-r border-slate-900 px-3 py-1.5">
                {payslip.panNumber ?? "-"}
              </div>
              <div className="border-r border-slate-900 px-3 py-1.5 font-bold">DOJ</div>
              <div className="px-3 py-1.5">{payslip.joiningDate ?? "-"}</div>
            </div>
            {/* Row 3 */}
            <div className="grid grid-cols-[180px_1fr_160px_1fr] border-b border-slate-900">
              <div className="border-r border-slate-900 px-3 py-1.5 font-bold">
                Bank Account No.
              </div>
              <div className="border-r border-slate-900 px-3 py-1.5">
                {payslip.bankAccountNumber ?? "-"}
              </div>
              <div className="border-r border-slate-900 px-3 py-1.5 font-bold">
                Working Days
              </div>
              <div className="px-3 py-1.5">{payslip.workingDays}</div>
            </div>
            {/* Row 4 */}
            <div className="grid grid-cols-[180px_1fr_160px_1fr]">
              <div className="border-r border-slate-900 px-3 py-1.5 font-bold">
                Bank IFSC Code
              </div>
              <div className="border-r border-slate-900 px-3 py-1.5">
                {payslip.bankIfsc ?? "-"}
              </div>
              <div className="border-r border-slate-900 px-3 py-1.5 font-bold">
                Pay Days
              </div>
              <div className="px-3 py-1.5">
                {payslip.payDays ??
                  Math.max(0, payslip.workingDays - (payslip.unpaidLeaveDays ?? 0))}
              </div>
            </div>
          </div>

          {/* Earnings & Deductions Table */}
          <div className="mt-3 overflow-hidden rounded border border-slate-900 text-xs">
            {/* Header */}
            <div className="grid grid-cols-[2fr_1fr_2fr_1fr] border-b border-slate-900 bg-[#D9E2EC] font-bold">
              <div className="border-r border-slate-900 px-3 py-1.5">Earnings</div>
              <div className="border-r border-slate-900 px-3 py-1.5 text-right">
                Amount(₹)
              </div>
              <div className="border-r border-slate-900 px-3 py-1.5">Deductions</div>
              <div className="px-3 py-1.5 text-right">Amount(₹)</div>
            </div>

            {/* Rows */}
            {isIntern ? (
              <>
                <div className="grid grid-cols-[2fr_1fr_2fr_1fr] border-b border-slate-900">
                  <div className="border-r border-slate-900 px-3 py-1.5 font-bold">
                    Stipend
                  </div>
                  <div className="border-r border-slate-900 px-3 py-1.5 text-right font-medium">
                    ₹ {formatMoney(stipend)}
                  </div>
                  <div className="border-r border-slate-900 px-3 py-1.5 font-bold">
                    Leave Deduction
                  </div>
                  <div className="px-3 py-1.5 text-right font-medium">
                    ₹ {formatMoney(leaveDeduction)}
                  </div>
                </div>
                <div className="grid grid-cols-[2fr_1fr_2fr_1fr] border-b border-slate-900">
                  <div className="border-r border-slate-900 px-3 py-1.5 font-bold">
                    Incentive
                  </div>
                  <div className="border-r border-slate-900 px-3 py-1.5 text-right font-medium">
                    ₹ {formatMoney(incentive)}
                  </div>
                  <div className="border-r border-slate-900 px-3 py-1.5"></div>
                  <div className="px-3 py-1.5 text-right font-medium"></div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-[2fr_1fr_2fr_1fr] border-b border-slate-900">
                  <div className="border-r border-slate-900 px-3 py-1.5 font-bold">
                    Basic
                  </div>
                  <div className="border-r border-slate-900 px-3 py-1.5 text-right font-medium">
                    ₹ {formatMoney(basic)}
                  </div>
                  <div className="border-r border-slate-900 px-3 py-1.5 font-bold">
                    Leave Deduction
                  </div>
                  <div className="px-3 py-1.5 text-right font-medium">
                    ₹ {formatMoney(leaveDeduction)}
                  </div>
                </div>
                <div className="grid grid-cols-[2fr_1fr_2fr_1fr] border-b border-slate-900">
                  <div className="border-r border-slate-900 px-3 py-1.5 font-bold">
                    House Rent Allowance
                  </div>
                  <div className="border-r border-slate-900 px-3 py-1.5 text-right font-medium">
                    ₹ {formatMoney(hra)}
                  </div>
                  <div className="border-r border-slate-900 px-3 py-1.5 font-bold">
                    PF
                  </div>
                  <div className="px-3 py-1.5 text-right font-medium">
                    ₹ {formatMoney(pf)}
                  </div>
                </div>
                <div className="grid grid-cols-[2fr_1fr_2fr_1fr] border-b border-slate-900">
                  <div className="border-r border-slate-900 px-3 py-1.5 font-bold">
                    Special Allowance
                  </div>
                  <div className="border-r border-slate-900 px-3 py-1.5 text-right font-medium">
                    ₹ {formatMoney(special)}
                  </div>
                  <div className="border-r border-slate-900 px-3 py-1.5 font-bold">
                    ESIC
                  </div>
                  <div className="px-3 py-1.5 text-right font-medium">
                    ₹ {formatMoney(esic)}
                  </div>
                </div>
                <div className="grid grid-cols-[2fr_1fr_2fr_1fr] border-b border-slate-900">
                  <div className="border-r border-slate-900 px-3 py-1.5 font-bold">
                    Other Allowance
                  </div>
                  <div className="border-r border-slate-900 px-3 py-1.5 text-right font-medium">
                    ₹ {formatMoney(other)}
                  </div>
                  <div className="border-r border-slate-900 px-3 py-1.5"></div>
                  <div className="px-3 py-1.5 text-right font-medium"></div>
                </div>
                <div className="grid grid-cols-[2fr_1fr_2fr_1fr] border-b border-slate-900">
                  <div className="border-r border-slate-900 px-3 py-1.5 font-bold">
                    Incentive
                  </div>
                  <div className="border-r border-slate-900 px-3 py-1.5 text-right font-medium">
                    ₹ {formatMoney(incentive)}
                  </div>
                  <div className="border-r border-slate-900 px-3 py-1.5"></div>
                  <div className="px-3 py-1.5 text-right font-medium"></div>
                </div>
              </>
            )}

            {/* Total Row */}
            <div className="grid grid-cols-[2fr_1fr_2fr_1fr] border-b border-slate-900 bg-[#D9E2EC] font-bold">
              <div className="border-r border-slate-900 px-3 py-1.5">
                {isIntern ? "Gross Stipend" : "Gross Salary"}
              </div>
              <div className="border-r border-slate-900 px-3 py-1.5 text-right">
                ₹ {formatMoney(payslip.grossSalary)}
              </div>
              <div className="border-r border-slate-900 px-3 py-1.5"></div>
              <div className="px-3 py-1.5 text-right">
                ₹ {formatMoney(payslip.totalDeductions)}
              </div>
            </div>

            {/* Net Payable Salary Bar */}
            <div className="grid grid-cols-[1fr_auto] border-b border-slate-900 bg-[#D9E2EC] px-3 py-2 font-bold text-slate-900">
              <div>{isIntern ? "Net Payable Stipend" : "Net Payable Salary"}</div>
              <div className="text-right text-sm">
                ₹ {formatMoney(payslip.netSalary)}
              </div>
            </div>

            {/* Net Pay in words Row */}
            <div className="grid grid-cols-[180px_1fr] px-3 py-2 text-xs">
              <div className="font-bold">Net Pay (in words)</div>
              <div className="text-right font-bold text-slate-900">
                {payslip.netPayInWords ?? "Zero only"}
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-8 text-center text-[11px] italic text-slate-500">
            (Note: This is a computer-generated payslip and does not require a physical
            signature)
          </div>
        </div>
      </div>
    </Dialog>
  );
}
